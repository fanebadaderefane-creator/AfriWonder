/**
 * CPO 10.21 — Programmes fidélité
 * GET /api/loyalty/me — mes points (auth)
 * GET /api/loyalty/seller/:sellerId — programme d'un vendeur (public)
 */
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import loyaltyService from '../services/loyalty.service.js';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const list = await loyaltyService.listMyLoyalties(req.user!.id);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

router.get('/seller/:sellerId', async (req, res, next) => {
  try {
    const sellerId = param(req, 'sellerId');
    const program = await loyaltyService.getProgramBySeller(sellerId);
    if (!program) return res.json({ success: true, data: null });
    res.json({ success: true, data: program });
  } catch (e) {
    next(e);
  }
});

// GET /api/loyalty/me/seller/:sellerId — mes points chez ce vendeur (auth)
router.get('/me/seller/:sellerId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sellerId = param(req, 'sellerId');
    const entry = await loyaltyService.getUserLoyalty(req.user!.id, sellerId);
    res.json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
});

export default router;
