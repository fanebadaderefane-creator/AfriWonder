import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as creatorDashboardService from '../services/creatorDashboard.service.js';
import * as monetizationService from '../services/monetization.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const dashboard = await creatorDashboardService.getCreatorDashboard(userId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

router.post('/request-monetization', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await monetizationService.requestMonetization(userId);
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    next(error);
  }
});

export default router;
