import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { idempotencyMiddleware, saveIdempotencyResponse } from '../middleware/idempotency.js';
import paymentService from '../services/payment.service.js';
import walletSecurityService from '../services/walletSecurity.service.js';
import platformControlService from '../services/platformControl.service.js';
import { evaluate as riskEvaluate } from '../services/riskEngine.service.js';
import { requireKycFor } from '../services/kycRequired.service.js';
import { auditFromRequest } from '../services/auditTrail.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/payments/stripe/checkout
router.post('/stripe/checkout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, items, successUrl, cancelUrl } = req.body;
    const result = await paymentService.createStripeCheckoutSession(userId, orderId, {
      items,
      successUrl,
      cancelUrl,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/payments/stripe/verify
router.get('/stripe/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.query.sessionId as string;
    const result = await paymentService.verifyStripePayment(sessionId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// Handler commun pour initier Orange Money
const handleOrangeMoneyInit = async (req: AuthRequest, res: any, next: any) => {
  try {
    const userId = req.user!.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;
    if (!(await platformControlService.isPaymentsEnabled())) {
      return res.status(503).json({ success: false, message: 'Paiements temporairement indisponibles.' });
    }
    const kyc = await requireKycFor(userId, 'payment');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });
    const { orderId, amount, phone, returnUrl } = req.body;
    const risk = await riskEvaluate({
      userId,
      amount: amount ?? 0,
      paymentMethod: 'orange_money',
      orderId,
      ip,
      action: 'payment_init',
    });
    if (!risk.allowed) return res.status(403).json({ success: false, message: risk.reason || 'Action non autorisée.' });
    const result = await paymentService.initiateOrangeMoneyPayment(userId, orderId, {
      amount,
      phone,
      returnUrl,
    });
    const key = req.headers['idempotency-key'] as string;
    if (key) saveIdempotencyResponse(key, 200, { success: true, data: result }).catch(() => {});
    auditFromRequest(req, 'payment_init', 'order', orderId, { amount, orderId }).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
};

// POST /api/payments/orange-money — idempotency + risk + KYC + audit
router.post('/orange-money', authenticate, idempotencyMiddleware, handleOrangeMoneyInit);

// POST /api/payments/orange-money/initiate — alias pour compatibilité
router.post('/orange-money/initiate', authenticate, idempotencyMiddleware, handleOrangeMoneyInit);

// POST /api/payments/orange-money/verify
router.post('/orange-money/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId, status, pay_token } = req.body;
    const result = await paymentService.verifyOrangeMoneyPayment(orderId, {
      status,
      pay_token,
    });

    // Traiter différents types de paiements selon l'orderId
    if (result.success && orderId && status === 'SUCCESS') {
      // 1. Vérifier si c'est un tip de vidéo
      try {
        const videoTipService = (await import('../services/videoTip.service.js')).default;
        const tip = await videoTipService.completeTip(orderId, status);
        if (tip.success) {
          logger.info('Tip complété après vérification Orange Money', { orderId, status });
          return res.json({ success: true, data: result, type: 'video_tip' });
        }
      } catch (error) {
        // Continuer pour vérifier d'autres types
      }

      // 2. Vérifier si c'est une contribution microcrédit
      try {
        const microcreditService = (await import('../services/microcredit.service.js')).default;
        await microcreditService.confirmContribution(orderId);
        logger.info('Contribution microcrédit confirmée', { orderId });
        return res.json({ success: true, data: result, type: 'loan_contribution' });
      } catch (error) {
        // Continuer
      }

      // 3. Vérifier si c'est une contribution crowdfunding
      try {
        const crowdfundingService = (await import('../services/crowdfunding.service.js')).default;
        await crowdfundingService.confirmContribution(orderId);
        logger.info('Contribution crowdfunding confirmée', { orderId });
        return res.json({ success: true, data: result, type: 'campaign_contribution' });
      } catch (error) {
        // Continuer
      }

      // 4. Vérifier si c'est un abonnement
      try {
        const subscriptionService = (await import('../services/subscription.service.js')).default;
        await subscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'subscription' });
      } catch (error) {
        // Continuer
      }

      // 5. Vérifier si c'est une commande marketplace
      try {
        const orderService = (await import('../services/order.service.js')).default;
        await orderService.confirmPayment(orderId);
        logger.info('Paiement commande confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'order' });
      } catch (error) {
        // Continuer
      }

      // 6. Vérifier si c'est un service
      try {
        const serviceService = (await import('../services/service.service.js')).default;
        await serviceService.confirmServicePayment(orderId);
        logger.info('Paiement service confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'service' });
      } catch (error) {
        // Continuer
      }

      // 7. Vérifier si c'est un cours
      try {
        const courseService = (await import('../services/course.service.js')).default;
        await courseService.confirmCoursePayment(orderId);
        logger.info('Paiement cours confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'course' });
      } catch (error) {
        // Continuer
      }

      // 8. Vérifier si c'est un événement
      try {
        const eventService = (await import('../services/event.service.js')).default;
        await eventService.confirmTicketPayment(orderId);
        logger.info('Paiement événement confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'event' });
      } catch (error) {
        // Continuer
      }

      // 9. Vérifier si c'est un challenge
      try {
        const challengeService = (await import('../services/challenge.service.js')).default;
        await challengeService.confirmParticipation(orderId);
        logger.info('Participation challenge confirmée', { orderId });
        return res.json({ success: true, data: result, type: 'challenge' });
      } catch (error) {
        // Continuer
      }

      // 10. Vérifier si c'est une pétition
      try {
        const civicService = (await import('../services/civic.service.js')).default;
        await civicService.confirmDonation(orderId);
        logger.info('Don pétition confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'petition' });
      } catch (error) {
        // Continuer
      }

      // 11. Vérifier si c'est un job premium
      try {
        const jobService = (await import('../services/job.service.js')).default;
        await jobService.confirmPremiumPayment(orderId);
        logger.info('Paiement job premium confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'job_premium' });
      } catch (error) {
        // Continuer
      }

      // 12. Vérifier si c'est une promotion produit
      try {
        const productService = (await import('../services/product.service.js')).default;
        await productService.confirmPromotionPayment(orderId);
        logger.info('Paiement promotion confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'promotion' });
      } catch (error) {
        // Continuer
      }

      // 13. Vérifier si c'est une vente flash
      try {
        const productService = (await import('../services/product.service.js')).default;
        await productService.confirmFlashSalePayment(orderId);
        logger.info('Paiement vente flash confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'flash_sale' });
      } catch (error) {
        // Continuer
      }

      // 14. Vérifier si c'est un gift général
      try {
        const giftService = (await import('../services/gift.service.js')).default;
        await giftService.confirmGiftPayment(orderId);
        logger.info('Paiement gift confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'gift' });
      } catch (error) {
        // Continuer
      }

      // 15. Vérifier si c'est un appel direct
      try {
        const directCallService = (await import('../services/directCall.service.js')).default;
        // Les appels sont terminés séparément, pas via webhook
        // On vérifie juste si c'est une transaction d'appel
        logger.info('Transaction appel direct détectée', { orderId });
        return res.json({ success: true, data: result, type: 'call' });
      } catch (error) {
        // Continuer
      }

      // 16. Vérifier si c'est un certificat
      try {
        const certificateService = (await import('../services/certificate.service.js')).default;
        await certificateService.confirmVerificationPayment(orderId);
        logger.info('Paiement certificat confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'certificate' });
      } catch (error) {
        // Aucun type correspondant trouvé
      }
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/stripe/webhook — Webhook Stripe (body brut, vérification signature)
router.post('/stripe/webhook', async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body as Buffer | undefined;
    if (!sig || !rawBody) {
      return res.status(400).json({ success: false, error: 'Signature ou body manquant' });
    }
    const paymentService = (await import('../services/payment.service.js')).default;
    const event = paymentService.verifyStripeWebhook(rawBody, sig);
    const result = await paymentService.handleStripeWebhookEvent(event);
    res.json({ received: true, processed: result.processed });
  } catch (err: any) {
    logger.warn('Stripe webhook error', { message: err?.message });
    res.status(400).json({ success: false, error: err?.message || 'Webhook invalide' });
  }
});

// POST /api/payment/webhook — Webhook unique pour tous les providers (Orange, MTN, Wave, etc.)
router.post('/webhook', async (req, res, next) => {
  try {
    const provider = (req.body?.provider || req.body?.source || 'orange_money').toLowerCase();
    const { orderId, status, pay_token, transaction_id, reference } = req.body || {};
    const effectiveRef = orderId || reference || req.body?.reference_id;
    if (!effectiveRef) {
      return res.status(400).json({ success: false, error: 'orderId or reference required' });
    }
    if (status !== 'SUCCESS' && status !== 'success' && status !== 'completed' && status !== 'successful') {
      return res.json({ success: true, received: true, processed: false });
    }
    const paymentService = (await import('../services/payment.service.js')).default;
    let verified = false;
    if (provider === 'orange_money') {
      const r = await paymentService.verifyOrangeMoneyPayment(effectiveRef, { status, pay_token });
      verified = r.success;
    } else if (provider === 'mtn_money' || provider === 'mtn') {
      const r = await paymentService.verifyMtnMoneyPayment(effectiveRef, { status, transaction_id });
      verified = r.success;
    } else if (provider === 'wave') {
      const r = await paymentService.verifyWavePayment(effectiveRef, { status });
      verified = r.success;
    } else if (provider === 'paystack') {
      const r = await paymentService.verifyPaystackPayment(effectiveRef, { reference: effectiveRef, status });
      verified = r.success;
    } else if (provider === 'flutterwave') {
      const r = await paymentService.verifyFlutterwavePayment(effectiveRef, { status, tx_id: transaction_id });
      verified = r.success;
    }
    if (verified) {
      const handlers = [
        ['video_tip', () => import('../services/videoTip.service.js').then(m => m.default.completeTip(effectiveRef, status))],
        ['loan_contribution', () => import('../services/microcredit.service.js').then(m => m.default.confirmContribution(effectiveRef))],
        ['campaign_contribution', () => import('../services/crowdfunding.service.js').then(m => m.default.confirmContribution(effectiveRef))],
        ['subscription', () => import('../services/subscription.service.js').then(m => m.default.confirmSubscription(effectiveRef))],
        ['order', () => import('../services/order.service.js').then(m => m.default.confirmPayment(effectiveRef))],
        ['service', () => import('../services/service.service.js').then(m => m.default.confirmServicePayment(effectiveRef))],
        ['course', () => import('../services/course.service.js').then(m => m.default.confirmCoursePayment(effectiveRef))],
        ['event', () => import('../services/event.service.js').then(m => m.default.confirmTicketPayment(effectiveRef))],
      ];
      for (const [, fn] of handlers) {
        try {
          if (typeof fn === 'function') await fn();
          logger.info('Webhook processed', { effectiveRef });
          break;
        } catch (_) {}
      }
    }
    res.json({ success: true, received: true, processed: verified });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/orange-money/webhook - Webhook Orange Money (pas d'authentification)
router.post('/orange-money/webhook', async (req, res, next) => {
  try {
    const { orderId, status, pay_token } = req.body;
    
    // Vérifier la signature du webhook (à implémenter selon Orange Money)
    // Pour l'instant, on traite directement

    if (status === 'SUCCESS' && orderId) {
      // Utiliser la même logique que verify
      const paymentService = (await import('../services/payment.service.js')).default;
      const result = await paymentService.verifyOrangeMoneyPayment(orderId, {
        status,
        pay_token,
      });

      // Traiter les différents types (même logique que verify)
      // 1. Video Tip
      try {
        const videoTipService = (await import('../services/videoTip.service.js')).default;
        await videoTipService.completeTip(orderId, status);
        logger.info('Tip complété via webhook', { orderId });
      } catch (error) {}

      // 2. Microcredit
      try {
        const microcreditService = (await import('../services/microcredit.service.js')).default;
        await microcreditService.confirmContribution(orderId);
        logger.info('Contribution microcrédit confirmée via webhook', { orderId });
      } catch (error) {}

      // 3. Crowdfunding
      try {
        const crowdfundingService = (await import('../services/crowdfunding.service.js')).default;
        await crowdfundingService.confirmContribution(orderId);
        logger.info('Contribution crowdfunding confirmée via webhook', { orderId });
      } catch (error) {}

      // 4. Subscription
      try {
        const subscriptionService = (await import('../services/subscription.service.js')).default;
        await subscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement confirmé via webhook', { orderId });
      } catch (error) {}

      // 5. Order
      try {
        const orderService = (await import('../services/order.service.js')).default;
        await orderService.confirmPayment(orderId);
        logger.info('Paiement commande confirmé via webhook', { orderId });
      } catch (error) {}

      // 6. Service
      try {
        const serviceService = (await import('../services/service.service.js')).default;
        await serviceService.confirmServicePayment(orderId);
        logger.info('Paiement service confirmé via webhook', { orderId });
      } catch (error) {}

      // 7. Course
      try {
        const courseService = (await import('../services/course.service.js')).default;
        await courseService.confirmCoursePayment(orderId);
        logger.info('Paiement cours confirmé via webhook', { orderId });
      } catch (error) {}

      // 8. Event
      try {
        const eventService = (await import('../services/event.service.js')).default;
        await eventService.confirmTicketPayment(orderId);
        logger.info('Paiement événement confirmé via webhook', { orderId });
      } catch (error) {}

      // 9. Challenge
      try {
        const challengeService = (await import('../services/challenge.service.js')).default;
        await challengeService.confirmParticipation(orderId);
        logger.info('Participation challenge confirmée via webhook', { orderId });
      } catch (error) {}

      // 10. Civic Petition
      try {
        const civicService = (await import('../services/civic.service.js')).default;
        await civicService.confirmDonation(orderId);
        logger.info('Don pétition confirmé via webhook', { orderId });
      } catch (error) {}

      // 11. Job Premium
      try {
        const jobService = (await import('../services/job.service.js')).default;
        await jobService.confirmPremiumPayment(orderId);
        logger.info('Paiement job premium confirmé via webhook', { orderId });
      } catch (error) {}

      // 12. Product Promotion
      try {
        const productService = (await import('../services/product.service.js')).default;
        await productService.confirmPromotionPayment(orderId);
        logger.info('Paiement promotion confirmé via webhook', { orderId });
      } catch (error) {}

      // 13. Flash Sale
      try {
        const productService = (await import('../services/product.service.js')).default;
        await productService.confirmFlashSalePayment(orderId);
        logger.info('Paiement vente flash confirmé via webhook', { orderId });
      } catch (error) {}

      // 14. Gift
      try {
        const giftService = (await import('../services/gift.service.js')).default;
        await giftService.confirmGiftPayment(orderId);
        logger.info('Paiement gift confirmé via webhook', { orderId });
      } catch (error) {}

      // 15. Certificate
      try {
        const certificateService = (await import('../services/certificate.service.js')).default;
        await certificateService.confirmVerificationPayment(orderId);
        logger.info('Paiement certificat confirmé via webhook', { orderId });
      } catch (error) {}

      // 16. Shipping
      try {
        const shippingService = (await import('../services/shipping.service.js')).default;
        await shippingService.confirmShippingPayment(orderId);
        logger.info('Paiement shipping confirmé via webhook', { orderId });
      } catch (error) {}
    }

    res.json({ success: true, received: true });
  } catch (error: any) {
    next(error);
  }
});

// ========== MTN MOBILE MONEY ==========
// POST /api/payments/mtn
router.post('/mtn', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, amount, phone, returnUrl } = req.body;
    const result = await paymentService.initiateMtnMoneyPayment(userId, orderId, { amount, phone, returnUrl });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/mtn/verify
router.post('/mtn/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId, status, transaction_id } = req.body;
    const result = await paymentService.verifyMtnMoneyPayment(orderId, { status, transaction_id });
    if (result.success && orderId && status === 'SUCCESS') {
      const orderService = (await import('../services/order.service.js')).default;
      await orderService.confirmPayment(orderId);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// ========== WAVE ==========
// POST /api/payments/wave
router.post('/wave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, amount, returnUrl, currency } = req.body;
    const result = await paymentService.initiateWavePayment(userId, orderId, { amount, returnUrl, currency });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wave/verify
router.post('/wave/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId, status } = req.body;
    const result = await paymentService.verifyWavePayment(orderId, { status });
    if (result.success && orderId) {
      const orderService = (await import('../services/order.service.js')).default;
      await orderService.confirmPayment(orderId);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// ========== FLUTTERWAVE ==========
// POST /api/payments/flutterwave
router.post('/flutterwave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, amount, email, returnUrl, currency } = req.body;
    const result = await paymentService.initiateFlutterwavePayment(userId, orderId, { amount, email, returnUrl, currency });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/flutterwave/verify
router.post('/flutterwave/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId, status, tx_id } = req.body;
    const result = await paymentService.verifyFlutterwavePayment(orderId, { status, tx_id });
    if (result.success && orderId) {
      const orderService = (await import('../services/order.service.js')).default;
      await orderService.confirmPayment(orderId);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// ========== PAYSTACK ==========
// POST /api/payments/paystack
router.post('/paystack', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, amount, email, returnUrl } = req.body;
    const result = await paymentService.initiatePaystackPayment(userId, orderId, { amount, email, returnUrl });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/paystack/verify
router.post('/paystack/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId, reference, status } = req.body;
    const result = await paymentService.verifyPaystackPayment(orderId, { reference, status });
    if (result.success && orderId) {
      const orderService = (await import('../services/order.service.js')).default;
      await orderService.confirmPayment(orderId);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/payments/wallet
router.get('/wallet', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const wallet = await paymentService.getWallet(userId);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wallet/deposit
router.post('/wallet/deposit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, description } = req.body;
    const wallet = await paymentService.addToWallet(userId, amount, description);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wallet/withdraw
router.post('/wallet/withdraw', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, description, pin } = req.body;
    const wallet = await paymentService.withdrawFromWallet(userId, amount, description, { pin });
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/payments/transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await paymentService.getTransactions(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/payments/wallet/security - État sécurité wallet (PIN défini, limite, blocage)
router.get('/wallet/security', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const sec = await walletSecurityService.getOrCreate(userId);
    res.json({
      success: true,
      data: {
        has_pin: !!sec.pin_hash,
        two_fa_required_for_withdrawal: !!sec.two_fa_required_for_withdrawal,
        withdrawal_daily_limit: sec.withdrawal_daily_limit,
        is_blocked: !!sec.is_blocked,
        blocked_reason: sec.blocked_reason,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wallet/set-pin
router.post('/wallet/set-pin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: { message: 'PIN requis' } });
    await walletSecurityService.setPin(userId, String(pin));
    res.json({ success: true, message: 'PIN défini' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wallet/validate-pin
router.post('/wallet/validate-pin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: { message: 'PIN requis' } });
    const valid = await walletSecurityService.validatePin(userId, String(pin));
    res.json({ success: true, valid });
  } catch (error: any) {
    next(error);
  }
});

export default router;

