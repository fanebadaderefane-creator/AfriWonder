import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import sellerSubscriptionService from '../services/sellerSubscription.service.js';

const router = Router();

// POST /api/seller-subscription/subscribe — S'abonner à un tier payant (wallet ou Orange Money)
router.post('/subscribe', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { tier, payment_method, orange_money_phone } = req.body;
    if (!tier || !['starter', 'business', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tier invalide. Valeurs: starter, business, enterprise' },
      });
    }
    const method = payment_method === 'orange_money' ? 'orange_money' : 'wallet';
    const subscription = await sellerSubscriptionService.subscribe(userId, tier, method, orange_money_phone);
    const isPending = subscription.paymentUrl != null;
    res.status(201).json({
      success: true,
      data: subscription,
      message: isPending
        ? 'Redirigez vers paymentUrl pour compléter le paiement Orange Money'
        : `Abonnement ${tier} activé pour 1 mois`,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/seller-subscription/active — Mon abonnement actif
router.get('/active', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const subscription = await sellerSubscriptionService.getActiveSubscription(userId);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    next(error);
  }
});

export default router;
