import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import marketplaceSubscriptionService from '../services/marketplaceSubscription.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

const isAdminRole = (role?: string) => ['super_admin', 'admin', 'moderation_admin'].includes(String(role || ''));

router.get('/plans', (_req, res) => {
  res.json({
    success: true,
    data: marketplaceSubscriptionService.getPlans(),
  });
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await marketplaceSubscriptionService.getPlanAndPermissions(req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/subscribe', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { plan_type, payment_method, orange_money_phone } = req.body || {};
    const data = await marketplaceSubscriptionService.subscribe(req.user!.id, plan_type, {
      payment_method,
      orange_money_phone,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/subscriptions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '50'), 10) || 50;
    const data = await marketplaceSubscriptionService.adminList(page, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/subscriptions/:id/status', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    const updated = await marketplaceSubscriptionService.adminUpdateStatus(
      param(req, 'id'),
      String(req.body?.status || ''),
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
