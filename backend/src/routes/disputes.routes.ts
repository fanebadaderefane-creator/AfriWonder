import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin, isAllowedAdminEmail } from '../middleware/adminRbac.js';
import { param } from '../utils/params.js';
import disputeService from '../services/dispute.service.js';

const router = Router();

// POST /api/disputes - CrÃ©er un litige
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { order_id, reason, description, evidence_images } = req.body;
    if (!order_id || typeof order_id !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'order_id requis' } });
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, error: { message: 'reason requis' } });
    }
    if (description && (typeof description !== 'string' || description.length > 4000)) {
      return res.status(400).json({ success: false, error: { message: 'description invalide' } });
    }
    if (evidence_images && (!Array.isArray(evidence_images) || evidence_images.length > 10)) {
      return res.status(400).json({ success: false, error: { message: 'evidence_images invalide (max 10)' } });
    }
    const dispute = await disputeService.createDispute(order_id, userId, {
      reason: reason.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      evidence_images: Array.isArray(evidence_images) ? evidence_images : [],
    });
    res.status(201).json({ success: true, data: dispute });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/disputes - Lister les litiges
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const as = (req.query.as as string) || 'buyer';
    if (!['buyer', 'seller', 'admin'].includes(as)) {
      return res.status(400).json({ success: false, error: { message: 'Parametre as invalide' } });
    }
    if (as === 'admin') {
      if (!isAllowedAdminEmail(req.user?.email) || (req.user?.role !== 'admin' && req.user?.role !== 'super_admin')) {
        return res.status(403).json({ success: false, error: { message: 'Acces admin requis' } });
      }
    }
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
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'message requis' } });
    }
    if (attachments && (!Array.isArray(attachments) || attachments.length > 10)) {
      return res.status(400).json({ success: false, error: { message: 'attachments invalide (max 10)' } });
    }
    const messageData = await disputeService.addMessage(disputeId, userId, {
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      is_staff: is_staff || false,
    });
    res.json({ success: true, data: messageData });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/disputes/:id/resolve - RÃ©soudre un litige (admin)
router.post('/:id/resolve', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const disputeId = param(req, 'id');
    const { resolution_type, resolution, refund_amount } = req.body;
    if (!resolution_type || !['refund', 'partial_refund', 'reject'].includes(resolution_type)) {
      return res.status(400).json({ success: false, error: { message: 'resolution_type invalide' } });
    }
    if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
      return res.status(400).json({ success: false, error: { message: 'resolution requise' } });
    }
    if (resolution_type === 'partial_refund') {
      const amount = Number(refund_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: { message: 'refund_amount requis pour partial_refund' } });
      }
    }
    const result = await disputeService.resolveDispute(disputeId, userId, {
      resolution_type,
      resolution: resolution.trim(),
      refund_amount,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;

