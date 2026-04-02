/**
 * CDC Phase 1 - Premium créateur (Basic 1000, Pro 3000 FCFA/mois)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import creatorSubscriptionService, { CREATOR_TIERS } from '../services/creatorSubscription.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/creator-subscription/tiers - Tarifs disponibles
router.get('/tiers', (_req, res) => {
  res.json({ success: true, data: CREATOR_TIERS });
});

// POST /api/creator-subscription/subscribe - S'abonner (créateur paie pour activer son tier)
router.post('/subscribe', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const { tier } = req.body;

    if (!tier || !['basic', 'pro'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tier requis: basic ou pro' },
      });
    }

    const subscription = await creatorSubscriptionService.subscribe(creatorId, tier);

    res.status(201).json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/creator-subscription/me - Mon abonnement actif
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = req.user!.id;
    const subscription = await creatorSubscriptionService.getActiveSubscription(creatorId);

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/creator-subscription/:creatorId - Abonnement actif d'un créateur (public)
router.get('/:creatorId', async (req, res, next) => {
  try {
    const creatorId = req.params.creatorId;
    const subscription = await creatorSubscriptionService.getActiveSubscription(creatorId);

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
