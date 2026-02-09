import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import productService from '../services/product.service.js';

const router = Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const subcategory = req.query.subcategory as string;
    const product_type = req.query.product_type as string;
    const seller_id = req.query.seller_id as string;
    const search = req.query.search as string;
    const min_price = req.query.min_price != null ? parseFloat(req.query.min_price as string) : undefined;
    const max_price = req.query.max_price != null ? parseFloat(req.query.max_price as string) : undefined;
    const verified_seller = req.query.verified_seller === 'true' || req.query.verified_seller === '1';
    const seller_country = req.query.seller_country as string;
    const min_rating = req.query.min_rating != null ? parseFloat(req.query.min_rating as string) : undefined;
    const delivery_option = req.query.delivery_option as string;
    const sort = (req.query.sort as string) || 'created_at';
    const order = ((req.query.order as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const result = await productService.list({
      page,
      limit,
      category,
      subcategory,
      product_type,
      seller_id,
      search,
      min_price,
      max_price,
      verified_seller: verified_seller || undefined,
      seller_country,
      min_rating,
      delivery_option,
      sort,
      order,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const product = await productService.getById(id);
    res.json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const product = await productService.create({
      ...req.body,
      seller_id: sellerId,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const sellerId = req.user!.id;
    const product = await productService.update(id, req.body, sellerId);
    res.json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const sellerId = req.user!.id;
    await productService.delete(id, sellerId);
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/products/:id/stock
router.patch('/:id/stock', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const sellerId = req.user!.id;
    const { quantity } = req.body;
    const product = await productService.updateStock(id, quantity, sellerId);
    res.json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/:id/promotion - Créer une promotion (payant)
router.post('/:id/promotion', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const { discount, startDate, endDate, phone } = req.body;

    if (!discount || !startDate || !endDate || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'discount, startDate, endDate et phone requis' },
      });
    }

    const result = await productService.createPromotion(productId, userId, {
      discount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      phone,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Promotion créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/:id/flash-sale - Créer une vente flash (payant)
router.post('/:id/flash-sale', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const { discount, startTime, endTime, stockLimit, phone } = req.body;

    if (!discount || !startTime || !endTime || !stockLimit || !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'discount, startTime, endTime, stockLimit et phone requis' },
      });
    }

    const result = await productService.createFlashSale(productId, userId, {
      discount,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      stockLimit,
      phone,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Vente flash créée. Redirigez vers paymentUrl pour compléter le paiement.',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/promotions/:id/confirm - Confirmer promotion (webhook)
router.post('/promotions/:id/confirm', async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await productService.confirmPromotionPayment(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Paiement promotion confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/flash-sales/:id/confirm - Confirmer vente flash (webhook)
router.post('/flash-sales/:id/confirm', async (req, res, next) => {
  try {
    const transactionId = param(req, 'id');
    const result = await productService.confirmFlashSalePayment(transactionId);

    res.json({
      success: true,
      data: result,
      message: 'Paiement vente flash confirmé',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

