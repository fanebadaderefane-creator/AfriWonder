import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import refundService from '../services/refund.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.post('/orders/:orderId/refund', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { amount, reason } = req.body;
    const refund = await refundService.requestRefund(param(req, 'orderId'), req.user!.id, { amount, reason });
    res.status(201).json({ success: true, data: refund });
  } catch (e) {
    next(e);
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const refunds = await refundService.listByUser(req.user!.id);
    res.json({ success: true, data: refunds });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/process', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin required' });
    const approve = req.body.approve === true;
    const refund = await refundService.processRefund(param(req, 'id'), req.user!.id, approve);
    res.json({ success: true, data: refund });
  } catch (e) {
    next(e);
  }
});

router.get('/admin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin required' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const result = await refundService.listAll(page, limit, status);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
