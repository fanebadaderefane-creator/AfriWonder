/**
 * ROUTES PAID VIDEO CALLS (User ↔ Star) — module isolé.
 *
 * Montée sur `/api/stars`. Toutes les routes (sauf discovery publique) exigent
 * `authenticate`. Les routes "star/*" exigent en plus un profil star actif.
 * Les routes admin vivent dans `starsAdmin.routes.ts` sous `/api/admin/stars`.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import starCallService from '../services/starCall.service.js';

const router = Router();

// ============================================================
// DISCOVERY PUBLIQUE
// ============================================================
const discoverQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  search: z.string().max(80).optional(),
  tag: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  verified_only: z.coerce.boolean().optional(),
});
router.get('/discover', validateQuery(discoverQuery), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof discoverQuery>;
    const out = await starCallService.discover({
      limit: q.limit,
      cursor: q.cursor,
      search: q.search,
      tag: q.tag,
      category: q.category,
      verifiedOnly: q.verified_only,
    });
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

/**
 * Page d'accueil discovery : retourne en un seul appel
 *  - 1 star "vedette" pour la bannière hero
 *  - 5-8 stars vérifiées pour la barre de stories
 *  - les catégories peuplées (pour la grille "Parcourir les catégories")
 *
 * Utilisé par l'écran `/stars` pour limiter le nombre de requêtes côté client.
 */
router.get('/home', async (_req, res, next) => {
  try {
    const out = await starCallService.discoverHome();
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

router.get('/profile/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const profile = await starCallService.getProfileById(id);
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

router.get('/profile/:id/ratings', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const limit = Number(req.query.limit ?? 20);
    const ratings = await starCallService.listRatings(id, limit);
    res.json({ success: true, ratings });
  } catch (err) { next(err); }
});

const slotQuery = z.object({
  duration: z.coerce.number().int().refine((n) => [5, 10, 15].includes(n), 'duration doit être 5, 10 ou 15'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().optional(),
});
router.get('/profile/:id/slots', validateQuery(slotQuery), async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const q = req.query as unknown as z.infer<typeof slotQuery>;
    const out = await starCallService.listSlots(id, q.duration as 5 | 10 | 15, q.day, q.timezone);
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

// ============================================================
// ME (FAN) — réservations, actions
// ============================================================
const createBookingSchema = z
  .object({
    star_profile_id: z.string().uuid(),
    duration_minutes: z.number().int().refine((n) => [5, 10, 15].includes(n)),
    scheduled_start_at: z.string().datetime(),
    fan_notes: z.string().max(500).optional(),
    payment_method: z.enum(['wallet', 'orange_money']).optional(),
    payment_phone: z.string().max(24).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === 'orange_money') {
      const digits = String(data.payment_phone || '').replace(/\D/g, '');
      if (digits.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Numéro Orange Money requis (minimum 8 chiffres)',
          path: ['payment_phone'],
        });
      }
    }
  });
router.post('/bookings', authenticate, validateBody(createBookingSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createBookingSchema>;
    const result = await starCallService.createBooking(req.user!.id, {
      star_profile_id: body.star_profile_id,
      duration_minutes: body.duration_minutes as 5 | 10 | 15,
      scheduled_start_at: body.scheduled_start_at,
      fan_notes: body.fan_notes,
      payment_method: body.payment_method,
      payment_phone: body.payment_phone,
    });
    /** Union typée `CreateStarBookingResult` : `in` discrimine wallet vs Orange Money. */
    if ('payment' in result) {
      res.status(201).json({
        success: true,
        booking: result.booking,
        payment: result.payment,
      });
    } else {
      res.status(201).json({
        success: true,
        booking: result.booking,
      });
    }
  } catch (err) { next(err); }
});

router.get('/bookings/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const asParam = typeof req.query.as === 'string' ? req.query.as : 'fan';
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const bookings = asParam === 'star'
      ? await starCallService.listMyBookingsAsStar(req.user!.id, status)
      : await starCallService.listMyBookingsAsFan(req.user!.id, status);
    res.json({ success: true, bookings });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const booking = await starCallService.getBooking(id, req.user!.id);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const as = typeof req.body?.as === 'string' ? req.body.as : 'fan';
    const booking = as === 'star'
      ? await starCallService.cancelByStar(id, req.user!.id, reason)
      : await starCallService.cancelByFan(id, req.user!.id, reason);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// ============================================================
// APPEL EN COURS (Agora + lifecycle)
// ============================================================
router.post('/bookings/:id/agora-token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const data = await starCallService.getAgoraTokenForBooking(id, req.user!.id);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const session = await starCallService.joinCall(id, req.user!.id);
    res.json({ success: true, session });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/heartbeat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const r = await starCallService.heartbeat(id, req.user!.id);
    res.json({ success: r.ok });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/end', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'hangup';
    const booking = await starCallService.endCall(id, req.user!.id, reason);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/extend', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const out = await starCallService.extendCall(id, req.user!.id);
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

// ============================================================
// RATINGS & DISPUTES
// ============================================================
const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});
router.post('/bookings/:id/rate', authenticate, validateBody(rateSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof rateSchema>;
    const rating = await starCallService.rateBooking(id, req.user!.id, body.rating, body.review);
    res.status(201).json({ success: true, rating });
  } catch (err) { next(err); }
});

const openDisputeSchema = z.object({
  reason: z.string().min(2).max(80),
  description: z.string().max(2000).optional(),
});
router.post('/bookings/:id/dispute', authenticate, validateBody(openDisputeSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = req.body as z.infer<typeof openDisputeSchema>;
    const dispute = await starCallService.openDispute(id, req.user!.id, body.reason, body.description);
    res.status(201).json({ success: true, dispute });
  } catch (err) { next(err); }
});

router.post('/disputes/:id/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const body = typeof req.body?.body === 'string' ? req.body.body : '';
    if (!body.trim()) return res.status(400).json({ success: false, error: { message: 'Message vide' } });
    const msg = await starCallService.addDisputeMessage(id, req.user!.id, body);
    res.status(201).json({ success: true, message: msg });
  } catch (err) { next(err); }
});

router.get('/disputes/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const disputes = await starCallService.listDisputesForUser(req.user!.id);
    res.json({ success: true, disputes });
  } catch (err) { next(err); }
});

// ============================================================
// STAR — configuration
// ============================================================
router.get('/me/star', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const profile = await starCallService.getMyProfile(req.user!.id);
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

/**
 * Dashboard star : solde disponible, stats période, 5 prochains bookings.
 * Utilisé par l'écran `/stars/dashboard` pour afficher wallet + planning.
 */
router.get('/me/star/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stats = await starCallService.getMyStarStats(req.user!.id);
    res.json({ success: true, stats });
  } catch (err) { next(err); }
});

const becomeSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string().max(10)).max(10).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  category: z.string().max(40).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  tier: z.enum(['standard', 'premium']).optional(),
});
router.post('/me/star/activate', authenticate, validateBody(becomeSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof becomeSchema>;
    const profile = await starCallService.becomeStar(req.user!.id, body);
    res.status(201).json({ success: true, profile });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  headline: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  languages: z.array(z.string().max(10)).max(10).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  price_fcfa_5min: z.number().nullable().optional(),
  price_fcfa_10min: z.number().nullable().optional(),
  price_fcfa_15min: z.number().nullable().optional(),
  max_calls_per_day: z.number().int().min(1).max(50).optional(),
  category: z.string().max(40).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
});
router.patch('/me/star', authenticate, validateBody(updateSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof updateSchema>;
    const profile = await starCallService.updateProfile(req.user!.id, body);
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

const toggleSchema = z.object({ active: z.boolean() });
router.post('/me/star/toggle', authenticate, validateBody(toggleSchema), async (req: AuthRequest, res, next) => {
  try {
    const profile = await starCallService.toggleActive(req.user!.id, (req.body as z.infer<typeof toggleSchema>).active);
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

const availabilitySchema = z.object({
  rules: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6).nullable().optional(),
    specific_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().max(64).optional(),
    is_blocked: z.boolean().optional(),
  })).max(200),
});
router.put('/me/star/availability', authenticate, validateBody(availabilitySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof availabilitySchema>;
    const rules = await starCallService.setAvailability(req.user!.id, body.rules);
    res.json({ success: true, rules });
  } catch (err) { next(err); }
});

// ============================================================
// REAPER (appelé par un cron externe ou par le scheduler interne)
// Protégé par X-Worker-Secret pour éviter l'usage arbitraire.
// ============================================================
router.post('/_internal/reaper', async (req, res, next) => {
  try {
    const expected = process.env.WORKER_SECRET;
    const got = req.get('x-worker-secret');
    if (!expected || expected !== got) {
      return res.status(403).json({ success: false });
    }
    const out = await starCallService.reaperTick();
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

export default router;
