import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { optionalIdempotencyMiddleware, saveIdempotencyResponse } from '../middleware/idempotency.js';
import eventService from '../services/event.service.js';
import platformControlService from '../services/platformControl.service.js';
import { evaluate as riskEvaluate } from '../services/riskEngine.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';
import { auditFromRequest } from '../services/auditTrail.service.js';

const router = Router();

const bookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Trop de réservations. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => (req.user?.id || req.ip || 'anon'),
});

// POST /api/events/cron/send-reminders - Rappels 24h et 1h (cron, protégé par CRON_SECRET)
router.post('/cron/send-reminders', async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET || process.env.EVENTS_REMINDERS_SECRET;
    if (secret && req.headers['x-cron-secret'] !== secret && req.body?.secret !== secret) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = await eventService.sendUpcomingReminders();
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events - Liste des événements (public)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string | undefined;
    const location = req.query.location as string | undefined;
    const event_type = req.query.event_type as string | undefined;
    const status = (req.query.status as string) || 'published';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const search = req.query.search as string | undefined;

    const result = await eventService.list(page, limit, {
      category,
      location,
      event_type,
      startDate,
      search,
      status,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/my-tickets - Mes billets (auth)
router.get('/my-tickets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const tickets = await eventService.listMyTickets(userId);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/check-in - Check-in par QR (auth recommandé pour audit)
router.post('/check-in', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { qr_code } = req.body;
    if (!qr_code) {
      return res.status(400).json({ success: false, error: { message: 'qr_code requis' } });
    }
    const result = await eventService.checkIn(qr_code);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/payments/:id/confirm - Confirmer paiement billet (callback / webhook)
router.post('/payments/:id/confirm', async (req, res, next) => {
  try {
    const paymentId = param(req, 'id');
    const { transaction_id } = req.body || {};
    const result = await eventService.confirmTicketPayment(paymentId, transaction_id);
    res.json({ success: true, data: result, message: 'Paiement billet confirmé' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/feature-payments/:id/confirm - Confirmer paiement mise en avant (callback)
router.post('/feature-payments/:id/confirm', async (req, res, next) => {
  try {
    const featurePaymentId = param(req, 'id');
    const { transaction_id } = req.body || {};
    const result = await eventService.confirmFeaturePayment(featurePaymentId, transaction_id);
    res.json({ success: true, data: result, message: 'Mise en avant activée' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events - Créer un événement (auth)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body;
    const startDate = body.startDate || body.start_date;
    const endDate = body.endDate || body.end_date;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { message: 'startDate et endDate requis' } });
    }

    const event = await eventService.create(userId, {
      title: body.title,
      description: body.description,
      location: body.location,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      price: body.price,
      category: body.category,
      image: body.image,
      event_type: body.event_type,
      capacity: body.capacity,
      currency: body.currency,
      is_free: body.is_free,
      is_featured: body.is_featured,
      virtual_url: body.virtual_url,
      refund_policy: body.refund_policy,
      speakers: body.speakers,
      sponsors: body.sponsors,
      ticket_types: body.ticket_types,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id - Détail événement (public, optionnel userId pour user_has_ticket)
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const userId = req.user?.id;
    const event = await eventService.getById(id, userId);
    res.json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/events/:id - Modifier (organisateur)
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const event = await eventService.update(eventId, userId, req.body);
    res.json({ success: true, data: event });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/tickets/lock - Lock temporaire 2 min (évite survente)
router.post('/:id/tickets/lock', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const { ticket_type, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);
    const result = await eventService.createLock(eventId, ticket_type || 'standard', userId, qty);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/book — kill switch, KYC, risk, audit. Idempotency-Key optionnel (si présent, évite double résa)
router.post('/:id/book', authenticate, bookLimiter, optionalIdempotencyMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;
    if (!(await platformControlService.isEventsEnabled())) {
      return res.status(503).json({ success: false, message: 'Billetterie temporairement indisponible.' });
    }
    const kyc = await requireKycFor(userId, 'payment');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });
    const risk = await riskEvaluate({ userId, ip, action: 'ticket_book', amount: 0 });
    if (!risk.allowed) return res.status(403).json({ success: false, message: risk.reason || 'Action non autorisée.' });
    const { phone, quantity, ticket_type, payment_method, city, source } = req.body;

    const result = await eventService.bookTicket(eventId, userId, {
      phone,
      quantity: quantity || 1,
      ticket_type: ticket_type || 'standard',
      payment_method: payment_method || 'orange_money',
      city: city || undefined,
      source: source || undefined,
    });

    const key = req.headers['idempotency-key'] as string;
    if (key) saveIdempotencyResponse(key, 201, { success: true, data: result }).catch(() => {});
    auditFromRequest(req, 'ticket_book', 'event', eventId, { eventId, quantity: quantity || 1 }).catch(() => {});

    res.status(201).json({
      success: true,
      data: result,
      message: result.payment_url ? 'Redirigez vers payment_url pour payer.' : result.message,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/dashboard - Dashboard organisateur (auth, organisateur)
router.get('/:id/dashboard', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const dashboard = await eventService.getOrganizerDashboard(eventId, userId);
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/feature - Payer la mise en avant (auth, organisateur)
router.post('/:id/feature', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const { phone } = req.body || {};
    const result = await eventService.payForFeature(eventId, userId, { phone });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/analytics - Analytics (auth, organisateur)
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const analytics = await eventService.getAnalytics(eventId, userId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/friends-attending - Amis inscrits (auth)
router.get('/:id/friends-attending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const result = await eventService.getFriendsAttending(eventId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/chat - Messages du chat (auth, inscrit, pendant l'événement)
router.get('/:id/chat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await eventService.listChatMessages(eventId, userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/chat - Envoyer un message (auth, inscrit, pendant l'événement)
router.post('/:id/chat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const { content } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, error: { message: 'content requis' } });
    }
    const message = await eventService.addChatMessage(eventId, userId, String(content).trim());
    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/participants/export - Export CSV participants (organisateur)
router.get('/:id/participants/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const csv = await eventService.exportParticipantsCsv(eventId, userId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants-${eventId.slice(0, 8)}.csv"`);
    res.send(csv);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/notify-participants - Message à tous les inscrits (organisateur)
router.post('/:id/notify-participants', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: { message: 'message requis' } });
    }
    const result = await eventService.notifyAllParticipants(eventId, userId, String(message).trim());
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/close - Clôturer l'événement (organisateur)
router.post('/:id/close', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const event = await eventService.closeEvent(eventId, userId);
    res.json({ success: true, data: event, message: 'Événement clôturé' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/like - Like / unlike (auth)
router.post('/:id/like', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const result = await eventService.like(eventId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/:id/comments - Liste commentaires (public)
router.get('/:id/comments', async (req, res, next) => {
  try {
    const eventId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await eventService.listComments(eventId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/comments - Ajouter commentaire (auth)
router.post('/:id/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const eventId = param(req, 'id');
    const userId = req.user!.id;
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, error: { message: 'content requis' } });
    }
    const comment = await eventService.addComment(eventId, userId, String(content).trim());
    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/tickets/:id/pdf - Télécharger le PDF du billet (auth, titulaire)
router.get('/tickets/:id/pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const ticketId = param(req, 'id');
    const userId = req.user!.id;
    const pdfBuffer = await eventService.generateTicketPdf(ticketId, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="billet-${ticketId.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/tickets/:ticketId/cancel - Annuler mon billet (auth)
router.post('/tickets/:ticketId/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const ticketId = param(req, 'ticketId');
    const userId = req.user!.id;
    const result = await eventService.cancelTicket(ticketId, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/tickets/:id/confirm - Alias pour confirmation paiement (legacy)
router.post('/tickets/:id/confirm', async (req, res, next) => {
  try {
    const paymentId = param(req, 'id');
    const result = await eventService.confirmTicketPayment(paymentId);
    res.json({ success: true, data: result, message: 'Paiement billet confirmé' });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/events/admin/pending - Liste des événements en attente d'approbation (Admin seulement)
router.get('/admin/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: { message: 'Accès refusé' } });
    }
    const events = await eventService.getPendingEvents();
    res.json({ success: true, data: events });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/approve - Approuver un événement (Admin seulement)
router.post('/:id/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: { message: 'Accès refusé' } });
    }
    const eventId = param(req, 'id');
    const event = await eventService.approveEvent(eventId, user.id);
    res.json({ success: true, data: event, message: 'Événement approuvé' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/events/:id/reject - Rejeter un événement (Admin seulement)
router.post('/:id/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (!['super_admin', 'admin', 'moderation_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: { message: 'Accès refusé' } });
    }
    const eventId = param(req, 'id');
    const { reason } = req.body || {};
    const event = await eventService.rejectEvent(eventId, user.id, reason);
    res.json({ success: true, data: event, message: 'Événement rejeté' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
