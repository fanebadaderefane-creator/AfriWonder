import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import orderReviewService from '../services/order-review.service.js';

const router = Router();

// POST /api/order-reviews - Créer un avis
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { order_id, order_item_id, product_id, product_rating, seller_rating, title, content, photos } = req.body;
    const review = await orderReviewService.createReview(order_id, userId, {
      order_item_id,
      product_id,
      product_rating,
      seller_rating,
      title,
      content,
      photos,
    });
    res.json({ success: true, data: review });
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

export default router;
