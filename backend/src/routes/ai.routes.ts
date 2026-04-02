import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { assistantService } from '../services/assistant.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

router.post('/assistant', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body;
    const result = await assistantService.chat(userId, message ?? '');
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
