import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import orderReviewService from '../services/order-review.service.js';
import moderationService from '../services/moderation.service.js';

const router = Router();

// POST /api/order-reviews - Créer un avis (CDC: critères détaillés, photos)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      order_id,
      order_item_id,
      product_id,
      product_rating,
      seller_rating,
      quality_rating,
      communication_rating,
      delivery_rating,
      conformity_rating,
      title,
      content,
      photos,
    } = req.body;
    if (!order_id || !product_id) {
      return res.status(400).json({ success: false, error: { message: 'order_id et product_id requis' } });
    }
    const review = await orderReviewService.createReview(order_id, userId, {
      order_item_id,
      product_id,
      product_rating,
      seller_rating,
      quality_rating,
      communication_rating,
      delivery_rating,
      conformity_rating,
      title,
      content,
      photos,
    });
    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/order-reviews/:id/reply - CDC: Réponse vendeur aux avis
router.patch('/:id/reply', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const reviewId = param(req, 'id');
    const sellerId = req.user!.id;
    const { reply } = req.body;
    if (!reply || typeof reply !== 'string' || !reply.trim()) {
      return res.status(400).json({ success: false, error: { message: 'reply requise' } });
    }
    const review = await orderReviewService.replyToReview(reviewId, sellerId, reply);
    res.json({ success: true, data: review });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/order-reviews/:id/report - CDC: Signalement avis frauduleux
router.post('/:id/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const reviewId = param(req, 'id');
    const userId = req.user!.id;
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, error: { message: 'reason requise' } });
    }
    const report = await moderationService.createReport(userId, {
      contentType: 'order_review',
      contentId: reviewId,
      reason: reason.trim(),
      severity: 'high',
    });
    res.status(201).json({ success: true, data: report, message: 'Signalement enregistré.' });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/order-reviews/products/:productId - Obtenir les avis d'un produit
router.get('/products/:productId', async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'productId');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await orderReviewService.getProductReviews(productId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/order-reviews/orders/:orderId - Obtenir les avis d'une commande
router.get('/orders/:orderId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const reviews = await orderReviewService.getOrderReviews(orderId);
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/order-reviews/orders/:orderId/rate-buyer - CDC 2.2.6: Notation mutuelle vendeur→acheteur
router.post('/orders/:orderId/rate-buyer', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderId = param(req, 'orderId');
    const sellerId = req.user!.id;
    const { rating: rawRating, content } = req.body;
    const rating = typeof rawRating === 'number' ? rawRating : parseInt(String(rawRating), 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: { message: 'rating requis (1-5)' } });
    }
    const review = await orderReviewService.rateBuyer(orderId, sellerId, { rating, content });
    res.status(201).json({ success: true, data: review, message: 'Acheteur noté.' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
