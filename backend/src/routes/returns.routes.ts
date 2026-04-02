import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { isAllowedAdminEmail } from '../middleware/adminRbac.js';
import returnService from '../services/return.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.post('/:orderId', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const userId = req.user!.id;
    const { reason, description, refund_amount } = req.body || {};

    const created = await returnService.createReturn(orderId, userId, {
      reason,
      description,
      refund_amount: Number(refund_amount),
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const role = req.user?.role || 'user';
    const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope : 'buyer';
    const scope = scopeRaw === 'admin' || scopeRaw === 'seller' ? scopeRaw : 'buyer';
    if (scope === 'admin' && !isAllowedAdminEmail(req.user?.email)) {
      return res.status(403).json({ success: false, error: { message: 'Acces admin requis' } });
    }

    const returns = await returnService.listReturns(userId, role, scope);
    res.json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
});

router.get('/:returnId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const returnId = param(req, 'returnId');
    const userId = req.user!.id;
    const role = req.user?.role || 'user';

    const item = await returnService.getReturnById(returnId, userId, role);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:returnId/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const returnId = param(req, 'returnId');
    const userId = req.user!.id;
    const role = req.user?.role || 'user';
    const { status, return_tracking_number } = req.body || {};

    const updated = await returnService.updateReturnStatus(returnId, userId, role, {
      status,
      return_tracking_number,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
