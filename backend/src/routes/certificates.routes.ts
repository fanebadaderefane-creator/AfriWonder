import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireWebhookSecret } from '../middleware/webhookSecret.js';
import { param } from '../utils/params.js';
import certificateService from '../services/certificate.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/certificates - Mes certificats (auth)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await certificateService.listByUser(userId);
    res.json({ success: true, data: list });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/certificates/verify/:token - Vérifier un certificat (public) — avant /:id pour priorité
router.get('/verify/:token', async (req, res, next) => {
  try {
    const token = param(req, 'token');
    const result = await certificateService.verifyByToken(token);
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Certificat non trouvé ou token invalide' } });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/certificates/:id/pdf - Télécharger le PDF du certificat (auth)
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const certificateId = param(req, 'id');
    const userId = req.user!.id;
    const pdfBuffer = await certificateService.generateCertificatePdf(certificateId, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificat-${certificateId.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/certificates/:id/verify - Demander vérification (payant)
router.post('/:id/verify', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const certificateId = param(req, 'id');
    const userId = req.user!.id;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'phone requis' },
      });
    }

    const result = await certificateService.requestVerifiedCertificate(certificateId, userId, {
      phone,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Demande de vérification créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/certificates/verifications/:id/confirm - Confirmer vérification (webhook; protéger par PAYMENT_WEBHOOK_SECRET en prod)
router.post('/verifications/:id/confirm', requireWebhookSecret, validateBody(jsonObjectBodySchema), async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await certificateService.confirmVerificationPayment(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Vérification certificat confirmée',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

