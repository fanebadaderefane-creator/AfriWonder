import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import { param } from '../utils/params.js';
import * as viralBonusService from '../services/viralBonus.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/pending', authenticate, requireAnyAdmin, async (_req, res, next) => {
  try {
    const bonuses = await viralBonusService.getPendingViralBonuses();
    res.json({ success: true, data: bonuses });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pay', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    await viralBonusService.markViralBonusPaid(id, req.user!.id);
    res.json({ success: true, message: 'Bonus virale payé' });
  } catch (error) {
    next(error);
  }
});

export default router;
