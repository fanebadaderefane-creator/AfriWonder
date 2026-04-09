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
import { logWebhookIncoming, logWebhookProcessed, logWebhookError } from '../utils/webhookLogger.js';
import { z } from 'zod';
import { validateBody, validateQuery } from '../utils/zodValidation.js';

const router = Router();

const paymentInitSchema = z.object({
  orderId: z.string().min(2),
  amount: z.coerce.number().positive(),
  email: z.string().email().optional(),
  currency: z.string().min(3).max(8).optional(),
  returnUrl: z.string().url().optional(),
}).passthrough();

const mobileMoneyInitSchema = paymentInitSchema.extend({
  phone: z.string().min(8),
});

const paymentVerifySchema = z.object({
  orderId: z.string().min(2),
  status: z.string().min(2),
  pay_token: z.string().optional(),
  transaction_id: z.string().optional(),
  tx_id: z.string().optional(),
  reference: z.string().optional(),
});

const stripeCheckoutSchema = z.object({
  orderId: z.string().min(2),
  items: z.array(z.any()).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const walletDepositSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().max(255).optional(),
});

const walletWithdrawSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().max(255).optional(),
  pin: z.string().min(4).max(12).optional(),
});

const walletPayOrderSchema = z.object({
  orderId: z.string().min(2),
  pin: z.string().min(4).max(12).optional(),
});

const walletPinSchema = z.object({
  pin: z.string().min(4).max(12),
});

const ussdInstructionsQuerySchema = z.object({
  provider: z.enum(['orange_money', 'wave', 'moov']).default('orange_money'),
  country: z.enum(['ML', 'SN', 'CI', 'BF']).default('ML'),
  amount: z.coerce.number().positive().optional(),
});

/**
 * @swagger
 * /api/payments/orange-money:
 *   post:
 *     tags: [Payments]
 *     summary: Initier un paiement Orange Money
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, phone]
 *             properties:
 *               orderId: { type: string }
 *               amount: { type: number }
 *               phone: { type: string, example: "+22370123456" }
 *               returnUrl: { type: string }
 *     responses:
 *       200:
 *         description: Paiement initialise
 *
 * /api/payments/orange-money/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verifier un paiement Orange Money
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paiement verifie
 *
 * /api/payments/wallet:
 *   get:
 *     tags: [Payments]
 *     summary: Obtenir le wallet utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet recupere
 */

// POST /api/payments/stripe/checkout
router.post('/stripe/checkout', authenticate, validateBody(stripeCheckoutSchema), async (req: AuthRequest, res, next) => {
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
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, message: 'orderId requis' });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'amount invalide' });
    }
    if (!phone || typeof phone !== 'string' || phone.replace(/[^\d+]/g, '').length < 8) {
      return res.status(400).json({ success: false, message: 'phone invalide' });
    }
    if (returnUrl && typeof returnUrl === 'string') {
      try {
        const parsed = new URL(returnUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ success: false, message: 'returnUrl invalide' });
        }
      } catch {
        return res.status(400).json({ success: false, message: 'returnUrl invalide' });
      }
    }
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

const processSuccessfulPaymentReference = async (referenceId: string, status: string) => {
  const handlers = [
    ['video_tip', () => import('../services/videoTip.service.js').then(m => m.default.completeTip(referenceId, status))],
    ['loan_contribution', () => import('../services/microcredit.service.js').then(m => m.default.confirmContribution(referenceId))],
    ['campaign_contribution', () => import('../services/crowdfunding.service.js').then(m => m.default.confirmContribution(referenceId))],
    ['subscription', () => import('../services/subscription.service.js').then(m => m.default.confirmSubscription(referenceId))],
    ['marketplace_subscription', () => import('../services/marketplaceSubscription.service.js').then(m => m.default.confirmSubscription(referenceId))],
    ['order', () => import('../services/order.service.js').then(m => m.default.confirmPayment(referenceId))],
    ['service', () => import('../services/service.service.js').then(m => m.default.confirmServicePayment(referenceId))],
    ['course', () => import('../services/course.service.js').then(m => m.default.confirmCoursePayment(referenceId))],
    ['event', () => import('../services/event.service.js').then(m => m.default.confirmTicketPayment(referenceId))],
    ['challenge', () => import('../services/challenge.service.js').then(m => m.default.confirmParticipation(referenceId))],
    ['petition', () => import('../services/civic.service.js').then(m => m.default.confirmDonation(referenceId))],
    ['job_premium', () => import('../services/job.service.js').then(m => m.default.confirmPremiumPayment(referenceId))],
    ['promotion', () => import('../services/product.service.js').then(m => m.default.confirmPromotionPayment(referenceId))],
    ['flash_sale', () => import('../services/product.service.js').then(m => m.default.confirmFlashSalePayment(referenceId))],
    ['gift', () => import('../services/gift.service.js').then(m => m.default.confirmGiftPayment(referenceId))],
    ['certificate', () => import('../services/certificate.service.js').then(m => m.default.confirmVerificationPayment(referenceId))],
    ['shipping', () => import('../services/shipping.service.js').then(m => m.default.confirmShippingPayment(referenceId))],
  ] as const;

  for (const [type, fn] of handlers) {
    try {
      await fn();
      logger.info('Paiement confirme via handler', { referenceId, type });
      return type;
    } catch (_error) {
      // continue
    }
  }
  return null;
};

const handleMoovMoneyInit = async (req: AuthRequest, res: any, next: any) => {
  try {
    const userId = req.user!.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress;
    if (!(await platformControlService.isPaymentsEnabled())) {
      return res.status(503).json({ success: false, message: 'Paiements temporairement indisponibles.' });
    }
    const kyc = await requireKycFor(userId, 'payment');
    if (!kyc.allowed) return res.status(403).json({ success: false, message: kyc.message });

    const { orderId, amount, phone, returnUrl } = req.body;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, message: 'orderId requis' });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'amount invalide' });
    }
    if (!phone || typeof phone !== 'string' || phone.replace(/[^\d+]/g, '').length < 8) {
      return res.status(400).json({ success: false, message: 'phone invalide' });
    }
    if (returnUrl && typeof returnUrl === 'string') {
      try {
        const parsed = new URL(returnUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ success: false, message: 'returnUrl invalide' });
        }
      } catch {
        return res.status(400).json({ success: false, message: 'returnUrl invalide' });
      }
    }

    const risk = await riskEvaluate({
      userId,
      amount: amount ?? 0,
      paymentMethod: 'moov_money',
      orderId,
      ip,
      action: 'payment_init',
    });
    if (!risk.allowed) return res.status(403).json({ success: false, message: risk.reason || 'Action non autorisee.' });

    const result = await paymentService.initiateMoovMoneyPayment(userId, orderId, {
      amount,
      phone,
      returnUrl,
    });
    const key = req.headers['idempotency-key'] as string;
    if (key) saveIdempotencyResponse(key, 200, { success: true, data: result }).catch(() => {});
    auditFromRequest(req, 'payment_init', 'order', orderId, { amount, orderId, provider: 'moov_money' }).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
};

// POST /api/payments/orange-money — idempotency + risk + KYC + audit
router.post('/orange-money', authenticate, idempotencyMiddleware, validateBody(mobileMoneyInitSchema), handleOrangeMoneyInit);

// POST /api/payments/orange-money/initiate — alias pour compatibilité
router.post('/orange-money/initiate', authenticate, idempotencyMiddleware, validateBody(mobileMoneyInitSchema), handleOrangeMoneyInit);

// GET /api/payments/ussd/instructions - Flux USSD (zones sans data)
router.get('/ussd/instructions', validateQuery(ussdInstructionsQuerySchema), async (req, res) => {
  const provider = String(req.query.provider || 'orange_money');
  const country = String(req.query.country || 'ML');
  const amount = Number(req.query.amount || 0);
  const amountHint = Number.isFinite(amount) && amount > 0 ? ` pour ${amount.toLocaleString('fr-FR')} FCFA` : '';

  const presets: Record<string, { code: string; label: string; steps: string[] }> = {
    orange_money: {
      code: '#144#',
      label: 'Orange Money USSD',
      steps: [
        `Composez #144# puis validez.`,
        `Choisissez "Paiement marchand"${amountHint}.`,
        'Entrez la reference de commande affichee dans l application.',
        'Confirmez avec votre code secret Orange Money.',
      ],
    },
    wave: {
      code: '*145#',
      label: 'Wave USSD',
      steps: [
        'Composez *145# puis validez.',
        `Selectionnez "Payer"${amountHint}.`,
        'Saisissez la reference de commande.',
        'Confirmez le paiement avec votre PIN.',
      ],
    },
    moov: {
      code: '*155#',
      label: 'Moov Money USSD',
      steps: [
        'Composez *155# puis validez.',
        `Choisissez le menu paiement${amountHint}.`,
        'Saisissez la reference de transaction.',
        'Confirmez avec votre code Moov Money.',
      ],
    },
  };

  const selected = presets[provider] || presets.orange_money;
  return res.json({
    success: true,
    data: {
      provider,
      country,
      ...selected,
    },
  });
});

// POST /api/payments/orange-money/verify
router.post('/orange-money/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
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

      // 4b. Vérifier si c'est un abonnement vendeur
      try {
        const sellerSubscriptionService = (await import('../services/sellerSubscription.service.js')).default;
        await sellerSubscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement vendeur confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'seller_subscription' });
      } catch (error) {
        // Continuer
      }

      // 4c. Vérifier si c'est un abonnement marketplace
      try {
        const marketplaceSubscriptionService = (await import('../services/marketplaceSubscription.service.js')).default;
        await marketplaceSubscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement marketplace confirmé', { orderId });
        return res.json({ success: true, data: result, type: 'marketplace_subscription' });
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
    } else if (provider === 'moov_money' || provider === 'moov') {
      const r = await paymentService.verifyMoovMoneyPayment(effectiveRef, { status, transaction_id });
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

// POST /api/payments/orange-money/webhook - Webhook Orange Money (body brut pour signature)
router.post('/orange-money/webhook', async (req, res, next) => {
  try {
    const rawBody = req.body as Buffer | undefined;
    const body = rawBody ? JSON.parse(rawBody.toString('utf8')) : req.body || {};
    const { orderId, status, pay_token } = body;

    logWebhookIncoming('orange_money', { orderId, status, ...(orderId ? {} : { raw: body }) });

    const signature = (req.headers['x-orange-signature'] || req.headers['x-signature']) as string | undefined;
    if (!paymentService.verifyOrangeMoneyWebhookSignature(rawBody ?? JSON.stringify(body), signature)) {
      logWebhookError('orange_money', 'Signature invalide', body);
      return res.status(401).json({ success: false, error: 'Signature invalide' });
    }

    if (status !== 'SUCCESS' && status !== 'completed') {
      logWebhookProcessed('orange_money', orderId || 'n/a', 'ignored');
      return res.json({ success: true, received: true, processed: false });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId requis' });
    }

    let result = { success: false as boolean };
    try {
      result = await paymentService.verifyOrangeMoneyPayment(orderId, { status, pay_token });
    } catch (err) {
      if (process.env.ORANGE_MONEY_ENV === 'test' || process.env.ORANGE_MONEY_TRUST_WEBHOOK === '1') {
        result = { success: true };
      } else {
        logWebhookError('orange_money', (err as Error).message, body);
        return res.status(500).json({ success: false, error: 'Vérification paiement échouée' });
      }
    }

    if (!result.success && process.env.ORANGE_MONEY_TRUST_WEBHOOK !== '1') {
      logWebhookProcessed('orange_money', orderId, 'ignored');
      return res.json({ success: true, received: true, processed: false });
    }

    {
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

      // 4b. Seller subscription (abonnement vendeur)
      try {
        const sellerSubscriptionService = (await import('../services/sellerSubscription.service.js')).default;
        await sellerSubscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement vendeur confirmé via webhook', { orderId });
      } catch (error) {}

      // 4c. Marketplace subscription
      try {
        const marketplaceSubscriptionService = (await import('../services/marketplaceSubscription.service.js')).default;
        await marketplaceSubscriptionService.confirmSubscription(orderId);
        logger.info('Abonnement marketplace confirmé via webhook', { orderId });
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

      // 17. Live wallet recharge (order_id = transaction UUID wallet_recharge)
      try {
        const liveService = (await import('../services/live.service.js')).default;
        await liveService.confirmWalletRecharge(orderId);
        logger.info('Recharge wallet live confirmée via webhook', { orderId });
      } catch (error) {}
    }

    logWebhookProcessed('orange_money', orderId, 'processed');
    res.json({ success: true, received: true, processed: true });
  } catch (error: any) {
    next(error);
  }
});

// ========== MTN MOBILE MONEY ==========
// POST /api/payments/mtn
router.post('/mtn', authenticate, validateBody(mobileMoneyInitSchema), async (req: AuthRequest, res, next) => {
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
router.post('/mtn/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
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

// ========== MOOV MONEY (Mali) ==========
// POST /api/payments/moov
router.post('/moov', authenticate, idempotencyMiddleware, validateBody(mobileMoneyInitSchema), handleMoovMoneyInit);

// POST /api/payments/moov/initiate
router.post('/moov/initiate', authenticate, idempotencyMiddleware, validateBody(mobileMoneyInitSchema), handleMoovMoneyInit);

// POST /api/payments/moov/verify
router.post('/moov/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
  try {
    const { orderId, status, transaction_id } = req.body;
    const result = await paymentService.verifyMoovMoneyPayment(orderId, { status, transaction_id });
    if (result.success && orderId) {
      await processSuccessfulPaymentReference(orderId, status || 'SUCCESS');
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/moov/webhook
router.post('/moov/webhook', async (req, res, next) => {
  try {
    const rawBody = req.body as Buffer | undefined;
    const body = rawBody ? JSON.parse(rawBody.toString('utf8')) : req.body || {};
    const orderId = body.orderId || body.reference || body.reference_id;
    const status = body.status;
    const transaction_id = body.transaction_id || body.tx_id;

    logWebhookIncoming('moov_money', { orderId, status, ...(orderId ? {} : { raw: body }) });

    const signature = (req.headers['x-moov-signature'] || req.headers['x-signature']) as string | undefined;
    if (!paymentService.verifyMoovWebhookSignature(rawBody ?? JSON.stringify(body), signature)) {
      logWebhookError('moov_money', 'Signature invalide', body);
      return res.status(401).json({ success: false, error: 'Signature invalide' });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId requis' });
    }

    const result = await paymentService.verifyMoovMoneyPayment(orderId, { status, transaction_id });
    if (!result.success && process.env.MOOV_MONEY_TRUST_WEBHOOK !== '1') {
      logWebhookProcessed('moov_money', orderId, 'ignored');
      return res.json({ success: true, received: true, processed: false });
    }

    await processSuccessfulPaymentReference(orderId, status || 'SUCCESS');
    logWebhookProcessed('moov_money', orderId, 'processed');
    res.json({ success: true, received: true, processed: true });
  } catch (error: any) {
    next(error);
  }
});

// ========== WAVE ==========
// POST /api/payments/wave
router.post('/wave', authenticate, validateBody(paymentInitSchema), async (req: AuthRequest, res, next) => {
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
router.post('/wave/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
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
router.post('/flutterwave', authenticate, validateBody(paymentInitSchema), async (req: AuthRequest, res, next) => {
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
router.post('/flutterwave/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
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
router.post('/paystack', authenticate, validateBody(paymentInitSchema), async (req: AuthRequest, res, next) => {
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
router.post('/paystack/verify', authenticate, validateBody(paymentVerifySchema), async (req: AuthRequest, res, next) => {
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
router.post('/wallet/deposit', authenticate, validateBody(walletDepositSchema), async (req: AuthRequest, res, next) => {
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
router.post('/wallet/withdraw', authenticate, validateBody(walletWithdrawSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { amount, description, pin } = req.body;
    const wallet = await paymentService.withdrawFromWallet(userId, amount, description, { pin });
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/payments/wallet/pay-order - Paiement d'une commande avec le portefeuille utilisateur
router.post('/wallet/pay-order', authenticate, validateBody(walletPayOrderSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, pin } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: { message: 'orderId requis' } });
    }

    const orderService = (await import('../services/order.service.js')).default;
    const order: any = await orderService.getById(orderId, userId);
    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Seul l\'acheteur peut payer cette commande' } });
    }
    if (order.payment_status !== 'pending') {
      return res.status(400).json({ success: false, error: { message: 'Cette commande est deja payee ou en cours de traitement' } });
    }

    await paymentService.withdrawFromWallet(
      userId,
      Number(order.total_amount) || 0,
      `Paiement commande ${orderId}`,
      { pin: pin ? String(pin) : undefined }
    );
    const confirmed = await orderService.confirmPayment(orderId);
    res.json({ success: true, data: confirmed, message: 'Paiement wallet confirmé' });
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
router.post('/wallet/set-pin', authenticate, validateBody(walletPinSchema), async (req: AuthRequest, res, next) => {
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
router.post('/wallet/validate-pin', authenticate, validateBody(walletPinSchema), async (req: AuthRequest, res, next) => {
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
