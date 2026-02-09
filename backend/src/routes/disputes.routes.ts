import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import disputeService from '../services/dispute.service.js';

const router = Router();

// POST /api/disputes - Créer un litige
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { order_id, reason, description, evidence_images } = req.body;
    const dispute = await disputeService.createDispute(order_id, userId, {
      reason,
      description,
      evidence_images,
    });
    res.json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/disputes - Lister les litiges
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const as = (req.query.as as string) || 'buyer';
    const status = req.query.status as string | undefined;
    const disputes = await disputeService.listDisputes(userId, {
      status,
      as: as as 'buyer' | 'seller' | 'admin',
    });
    res.json({ success: true, data: disputes });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/disputes/:id - Obtenir un litige
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const disputeId = param(req, 'id');
    const dispute = await disputeService.getDispute(disputeId, userId);
    res.json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/disputes/:id/messages - Ajouter un message au litige
router.post('/:id/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const disputeId = param(req, 'id');
    const { message, attachments, is_staff } = req.body;
    const messageData = await disputeService.addMessage(disputeId, userId, {
      message,
      attachments,
      is_staff: is_staff || false,
    });
    res.json({ success: true, data: messageData });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/disputes/:id/resolve - Résoudre un litige (admin)
router.post('/:id/resolve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    // TODO: Vérifier que l'utilisateur est admin
    const disputeId = param(req, 'id');
    const { resolution_type, resolution, refund_amount } = req.body;
    const result = await disputeService.resolveDispute(disputeId, userId, {
      resolution_type,
      resolution,
      refund_amount,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;
