import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import tontineService from '../services/tontine.service.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  contribution_amount: z.number().positive(),
  max_members: z.number().int().min(2).max(50),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  payout_order_mode: z.enum(['random', 'manual']).optional(),
  currency: z.string().optional(),
  rules: z.record(z.unknown()).optional(),
});

const joinSchema = z.object({
  invite_code: z.string().min(4).max(32),
});

const contributeSchema = z.object({
  cycle_number: z.number().int().min(1),
});

// GET /api/tontines — mes tontines (en tant que membre)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const items = await tontineService.listMyTontines(req.user!.id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/tontines — créer une tontine
router.post('/', authenticate, validateBody(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const t = await tontineService.createTontine(req.user!.id, {
      name: body.name,
      description: body.description,
      contributionAmount: body.contribution_amount,
      maxMembers: body.max_members,
      frequency: body.frequency,
      payoutOrderMode: body.payout_order_mode,
      currency: body.currency,
      rules: body.rules,
    });
    res.status(201).json({ success: true, data: t });
  } catch (err) {
    next(err);
  }
});

// POST /api/tontines/join — rejoindre via code d'invitation
router.post('/join', authenticate, validateBody(joinSchema), async (req: AuthRequest, res, next) => {
  try {
    const { invite_code } = req.body as z.infer<typeof joinSchema>;
    const m = await tontineService.joinByInviteCode(req.user!.id, invite_code);
    res.status(201).json({ success: true, data: m });
  } catch (err) {
    next(err);
  }
});

// GET /api/tontines/:id — détail
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const detail = await tontineService.getTontineDetail(id, req.user!.id);
    if (!detail) return res.status(404).json({ success: false, error: 'Tontine introuvable' });
    return res.json({ success: true, data: detail });
  } catch (err) {
    return next(err);
  }
});

// POST /api/tontines/:id/start — démarrer (créateur uniquement)
router.post('/:id/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const t = await tontineService.startTontine(id, req.user!.id);
    res.json({ success: true, data: t });
  } catch (err) {
    next(err);
  }
});

// POST /api/tontines/:id/contribute — payer la contribution d'un cycle
router.post('/:id/contribute', authenticate, validateBody(contributeSchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { cycle_number } = req.body as z.infer<typeof contributeSchema>;
    const c = await tontineService.contributeToCycle(id, cycle_number, req.user!.id);
    res.json({ success: true, data: c });
  } catch (err) {
    next(err);
  }
});

// POST /api/tontines/:id/leave — quitter une tontine (draft uniquement)
router.post('/:id/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    await tontineService.leaveTontine(id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/tontines/:id/cancel — annuler (créateur, draft uniquement)
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    await tontineService.cancelTontine(id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
