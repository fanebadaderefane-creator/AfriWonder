import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import verificationService from '../services/verification.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await verificationService.getMyStatus(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const data = await verificationService.submit(userId, req.body);
    res.status(201).json({ success: true, data, message: 'Demande enregistrée' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
