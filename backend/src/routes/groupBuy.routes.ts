import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import groupBuyService from '../services/groupBuy.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// POST /api/group-buys/:id/join — rejoindre un groupe d'achat
router.post('/:id/join', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const groupBuyId = param(req, 'id');
    const userId = req.user!.id;
    const quantity = Math.max(1, parseInt(String(req.body?.quantity), 10) || 1);
    const group = await groupBuyService.join(groupBuyId, userId, quantity);
    res.json({ success: true, data: group, message: 'Vous avez rejoint le groupe' });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

export default router;
