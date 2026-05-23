import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import wishlistService from '../services/wishlist.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/wishlist
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await wishlistService.getWishlist(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/wishlist/add
router.post('/add', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { productId } = req.body;
    const item = await wishlistService.addToWishlist(req.user!.id, productId);
    res.json({ success: true, data: item });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/wishlist/remove/:productId
router.delete('/remove/:productId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const item = await wishlistService.removeFromWishlist(req.user!.id, param(req, 'productId'));
    res.json({ success: true, data: item });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/wishlist/check/:productId
router.get('/check/:productId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isInWishlist = await wishlistService.isInWishlist(req.user!.id, param(req, 'productId'));
    res.json({ success: true, data: { isInWishlist } });
  } catch (error: any) {
    next(error);
  }
});

export default router;

