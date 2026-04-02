import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import subscriptionService from '../services/subscription.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/subscriptions/tiers - Créer un tier (créateur)
router.post('/tiers', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, price, benefits } = req.body;

    const tier = await subscriptionService.createTier(userId, {
      name,
      price,
      benefits: Array.isArray(benefits) ? benefits : [],
    });

    res.status(201).json({
      success: true,
      data: tier,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/subscriptions/subscribe - S'abonner à un créateur
router.post('/subscribe', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { tierId, phone } = req.body;

    if (!tierId || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'tierId et phone requis' },
      });
    }

    const result = await subscriptionService.subscribe(userId, tierId, { phone });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Abonnement créé. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/subscriptions/:id/confirm - Confirmer un abonnement (webhook)
router.post('/:id/confirm', validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const subscriptionId = param(req, 'id');
    const subscription = await subscriptionService.confirmSubscription(subscriptionId);

    res.json({
      success: true,
      data: subscription,
      message: 'Abonnement confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/subscriptions/my-subscriptions - Mes abonnements
router.get('/my-subscriptions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const subscriptions = await subscriptionService.getUserSubscriptions(userId);

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/subscriptions/my-subscribers - Mes abonnés (créateur)
router.get('/my-subscribers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const subscribers = await subscriptionService.getCreatorSubscribers(userId);

    res.json({
      success: true,
      data: subscribers,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

