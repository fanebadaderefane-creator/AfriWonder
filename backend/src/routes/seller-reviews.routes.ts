import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import sellerReviewService from '../services/sellerReview.service.js';

const router = Router();

router.get('/seller/:sellerId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await sellerReviewService.listBySeller(param(req, 'sellerId'), page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { seller_id, rating, content, order_id } = req.body;
    const review = await sellerReviewService.create(req.user!.id, seller_id, { rating, content, order_id });
    res.status(201).json({ success: true, data: review });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { rating, content } = req.body;
    const review = await sellerReviewService.update(param(req, 'id'), req.user!.id, { rating, content });
    res.json({ success: true, data: review });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await sellerReviewService.delete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
