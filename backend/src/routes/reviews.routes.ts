import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import reviewService from '../services/review.service.js';

const router = Router();

// GET /api/reviews/product/:productId
router.get('/product/:productId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await reviewService.list(param(req, 'productId'), page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/reviews
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { productId, rating, title, content, photos } = req.body;
    const review = await reviewService.create(req.user!.id, productId, {
      rating,
      title,
      content,
      photos,
    });
    res.json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/reviews/:id
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { rating, title, content, photos } = req.body;
    const review = await reviewService.update(param(req, 'id'), req.user!.id, {
      rating,
      title,
      content,
      photos,
    });
    res.json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await reviewService.delete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/reviews/:id/helpful
router.post('/:id/helpful', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const review = await reviewService.markHelpful(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/reviews/:id/reply
router.post('/:id/reply', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { content } = req.body;
    const reply = await reviewService.reply(param(req, 'id'), req.user!.id, content);
    res.json({ success: true, data: reply });
  } catch (error: any) {
    next(error);
  }
});

export default router;

