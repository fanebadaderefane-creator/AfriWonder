import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as referralService from '../services/referral.service.js';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stats = await referralService.getReferralStats(req.user!.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

router.get('/code', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const code = await referralService.getOrCreateReferralCode(req.user!.id);
    res.json({ success: true, data: { code } });
  } catch (error) {
    next(error);
  }
});

export default router;
