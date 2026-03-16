import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireWebhookSecret } from '../middleware/webhookSecret.js';
import { param } from '../utils/params.js';
import giftService from '../services/gift.service.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/gifts - Liste des gifts disponibles
router.get('/', async (req, res, next) => {
  try {
    const gifts = await prisma.gift.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' },
    });

    res.json({
      success: true,
      data: gifts,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/gifts/send - Envoyer un gift
router.post('/send', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { giftId, recipientId, phone, message } = req.body;

    if (!giftId || !recipientId || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'giftId, recipientId et phone requis' },
      });
    }

    const result = await giftService.sendGift(userId, recipientId, {
      giftId,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Gift envoyé. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/gifts/:id/confirm - Confirmer le paiement (webhook; protéger par PAYMENT_WEBHOOK_SECRET en prod)
router.post('/:id/confirm', requireWebhookSecret, async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await giftService.confirmGiftPayment(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Paiement gift confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

