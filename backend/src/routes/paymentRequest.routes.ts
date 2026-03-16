import { Router } from 'express';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import * as paymentRequestService from '../services/paymentRequest.service.js';

const router = Router();

// POST /api/payment-request - Créer une demande de paiement (générer QR)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { amount, currency, ttl_sec } = req.body;
    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: { message: 'Montant invalide' } });
    }
    const request = await paymentRequestService.createPaymentRequest(
      req.user!.id,
      Number(amount),
      currency || 'XOF',
      ttl_sec ? Number(ttl_sec) : undefined
    );
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment-request/pay - Payer via QR (scanner et payer)
router.post('/pay', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) {
      return res.status(400).json({ success: false, error: { message: 'qr_token requis' } });
    }
    const result = await paymentRequestService.payByQr(String(qr_token).trim(), req.user!.id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: (result as { error: string }).error } });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/payment-request/:qrToken - Détail d'une demande (pour affichage avant paiement)
router.get('/:qrToken', optionalAuth, async (req, res, next) => {
  try {
    const qrToken = typeof req.params.qrToken === 'string' ? req.params.qrToken : req.params.qrToken?.[0];
    if (!qrToken) return res.status(400).json({ success: false, error: { message: 'Token requis' } });
    const request = await paymentRequestService.getPaymentRequestByToken(qrToken);
    if (!request) return res.status(404).json({ success: false, error: { message: 'Demande introuvable' } });
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

export default router;
