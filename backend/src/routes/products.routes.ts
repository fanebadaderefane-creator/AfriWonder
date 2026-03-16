import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import productService from '../services/product.service.js';
import productQuestionService from '../services/product-question.service.js';
import auctionService from '../services/auction.service.js';
import groupBuyService from '../services/groupBuy.service.js';
import { responseCache } from '../middleware/responseCache.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Lister les produits marketplace
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginee de produits
 *   post:
 *     tags: [Products]
 *     summary: Creer un produit vendeur
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, category, stock]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               stock: { type: integer }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Produit cree
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Detail d'un produit
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produit trouve
 *   put:
 *     tags: [Products]
 *     summary: Modifier un produit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produit mis a jour
 *   delete:
 *     tags: [Products]
 *     summary: Supprimer un produit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produit supprime
 */

// GET /api/products
router.get('/', responseCache('products:list', { ttlMs: 20_000 }), async (req, res, next) => {
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

// GET /api/products/compare - Comparateur de prix (ids=id1,id2,id3)
router.get('/compare', responseCache('products:compare', { ttlMs: 30_000 }), async (req, res, next) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.status(400).json({ success: false, error: { message: 'ids requis (ex: ids=id1,id2)' } });
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (ids.length === 0) return res.status(400).json({ success: false, error: { message: 'Au moins un id requis' } });
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: 'active' },
      include: { seller: { select: { id: true, username: true } } },
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    res.json({ success: true, data: ids.map((id) => byId[id] || null).filter(Boolean) });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/questions/:questionId/answer - Must be before /:id
router.post('/questions/:questionId/answer', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const questionId = param(req, 'questionId');
    const sellerId = req.user!.id;
    const { answer } = req.body;
    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({ success: false, error: { message: 'answer requise' } });
    }
    const q = await productQuestionService.answer(questionId, sellerId, answer.trim());
    res.json({ success: true, data: q });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/suggestions?q=...&limit=8
router.get('/suggestions', responseCache('products:suggestions', { ttlMs: 30_000 }), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = parseInt(req.query.limit as string) || 8;
    if (!q) return res.json({ success: true, data: [] });
    const data = await productService.suggestions({ query: q, limit });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/highlights?trending_limit=8&new_limit=8
router.get('/highlights', responseCache('products:highlights', { ttlMs: 30_000 }), async (req, res, next) => {
  try {
    const trendingLimit = parseInt(req.query.trending_limit as string) || 8;
    const newestLimit = parseInt(req.query.new_limit as string) || 8;
    const data = await productService.highlights(trendingLimit, newestLimit);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/recommendations?limit=8
router.get('/recommendations', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const data = await productService.recommendations({ userId: req.user?.id, limit });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/nearby?latitude=...&longitude=...&radius_km=50&limit=200
router.get('/nearby', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radiusKm = parseFloat(req.query.radius_km as string) || 50;
    const limit = parseInt(req.query.limit as string) || 200;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const min_price = req.query.min_price != null ? parseFloat(req.query.min_price as string) : undefined;
    const max_price = req.query.max_price != null ? parseFloat(req.query.max_price as string) : undefined;
    const condition = req.query.condition as string;
    const delivery_option = req.query.delivery_option as string;
    const verified_seller = req.query.verified_seller === 'true' || req.query.verified_seller === '1';
    const min_rating = req.query.min_rating != null ? parseFloat(req.query.min_rating as string) : undefined;
    const seller_country = req.query.seller_country as string;
    const min_lat = req.query.min_lat != null ? parseFloat(req.query.min_lat as string) : undefined;
    const max_lat = req.query.max_lat != null ? parseFloat(req.query.max_lat as string) : undefined;
    const min_lng = req.query.min_lng != null ? parseFloat(req.query.min_lng as string) : undefined;
    const max_lng = req.query.max_lng != null ? parseFloat(req.query.max_lng as string) : undefined;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, error: { message: 'latitude et longitude sont requis' } });
    }

    const data = await productService.nearby({
      latitude,
      longitude,
      radiusKm,
      limit,
      category,
      search,
      min_price,
      max_price,
      condition,
      delivery_option,
      verified_seller: verified_seller || undefined,
      min_rating,
      seller_country,
      min_lat,
      max_lat,
      min_lng,
      max_lng,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.38 — Mes alertes prix / stock
router.get('/alerts/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await productService.listMyProductAlerts(userId, page, limit);
    res.json({ success: true, data: result.alerts, pagination: result.pagination });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.37 — Mes précommandes
router.get('/preorders/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await productService.listMyPreorders(userId, page, limit);
    res.json({ success: true, data: result.preorders, pagination: result.pagination });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.37 — Annuler une précommande
router.delete('/preorders/:preorderId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const preorderId = param(req, 'preorderId');
    const userId = req.user!.id;
    await productService.cancelPreorder(userId, preorderId);
    res.json({ success: true, message: 'Précommande annulée' });
  } catch (error: any) {
    next(error);
  }
});

// CPO 9.25 — Groupes d'achat : liste pour un produit
router.get('/:id/group-buys', async (req, res, next) => {
  try {
    const productId = param(req, 'id');
    const groups = await groupBuyService.listByProduct(productId);
    res.json({ success: true, data: groups });
  } catch (error: any) {
    next(error);
  }
});
router.post('/:id/group-buys', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const minQuantity = Math.max(2, parseInt(String(req.body?.min_quantity), 10) || 2);
    const group = await groupBuyService.create(productId, userId, minQuantity);
    res.status(201).json({ success: true, data: group });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ success: false, error: { message: error.message } });
    next(error);
  }
});

// CPO 6.35 — Enchères : GET /api/products/:id/auction
router.get('/:id/auction', async (req, res, next) => {
  try {
    const productId = param(req, 'id');
    const auction = await auctionService.getByProductId(productId);
    if (!auction) return res.status(404).json({ success: false, error: { message: 'Enchère non trouvée' } });
    res.json({ success: true, data: auction });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.35 — Enchères : créer une enchère (vendeur)
router.post('/:id/auction', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const sellerId = req.user!.id;
    const { start_price, end_at } = req.body;
    const startPrice = start_price != null ? Number(start_price) : NaN;
    const endAt = end_at ? new Date(end_at) : null;
    if (!Number.isFinite(startPrice) || startPrice <= 0 || !endAt || isNaN(endAt.getTime())) {
      return res.status(400).json({ success: false, error: { message: 'start_price (nombre > 0) et end_at (ISO date) requis' } });
    }
    const auction = await auctionService.create({ product_id: productId, seller_id: sellerId, start_price: startPrice, end_at: endAt });
    res.status(201).json({ success: true, data: auction });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.35 — Enchères : placer une enchère
router.post('/:id/auction/bid', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const amount = req.body?.amount != null ? Number(req.body.amount) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: { message: 'amount (nombre > 0) requis' } });
    }
    const auction = await auctionService.placeBid({ product_id: productId, user_id: userId, amount });
    res.json({ success: true, data: auction });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/products/:id — détail produit
router.get('/:id', async (req, res, next) => {
  try {
    const id = param(req, 'id');
    const product = await productService.getById(id);
    res.json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.38 — Mes alertes pour ce produit
router.get('/:id/alerts/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const alerts = await productService.getProductAlertsForUser(userId, productId);
    res.json({ success: true, data: alerts });
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

// CPO 6.38 — Ajouter alerte prix ou stock sur un produit
router.post('/:id/alerts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const { alert_type, target_price } = req.body;
    if (!alert_type || !['price', 'stock'].includes(alert_type)) {
      return res.status(400).json({ success: false, error: { message: 'alert_type requis: price ou stock' } });
    }
    if (alert_type === 'price' && (target_price == null || typeof target_price !== 'number' || target_price <= 0)) {
      return res.status(400).json({ success: false, error: { message: 'target_price requis pour une alerte prix (nombre > 0)' } });
    }
    const alert = await productService.addProductAlert(userId, productId, alert_type, alert_type === 'price' ? target_price : undefined);
    res.status(201).json({ success: true, data: alert });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.38 — Supprimer une alerte
router.delete('/:id/alerts/:type', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const alertType = param(req, 'type');
    const userId = req.user!.id;
    if (!['price', 'stock'].includes(alertType)) {
      return res.status(400).json({ success: false, error: { message: 'type invalide: price ou stock' } });
    }
    await productService.removeProductAlert(userId, productId, alertType);
    res.json({ success: true, message: 'Alerte supprimée' });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.36 — Proposer un prix (négociation)
router.post('/:id/offers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const offeredPrice = parseFloat(String(req.body?.offered_price ?? 0));
    if (!offeredPrice || offeredPrice <= 0) {
      return res.status(400).json({ success: false, error: { message: 'offered_price requis (nombre > 0)' } });
    }
    const offer = await productService.createOffer(userId, productId, offeredPrice);
    res.status(201).json({ success: true, data: offer });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.36 — Mon offre pour ce produit
router.get('/:id/offers/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const offer = await productService.getMyOfferForProduct(userId, productId);
    res.json({ success: true, data: offer });
  } catch (error: any) {
    next(error);
  }
});

// CPO 6.37 — Créer une précommande
router.post('/:id/preorder', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const quantity = Math.max(1, Math.min(99, parseInt(String(req.body?.quantity || 1), 10) || 1));
    const preorder = await productService.createPreorder(userId, productId, quantity);
    res.status(201).json({ success: true, data: preorder });
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

// GET /api/products/:id/questions - Q/R publiques (CDC)
router.get('/:id/questions', async (req, res, next) => {
  try {
    const productId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await productQuestionService.listByProduct(productId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/products/:id/questions - Poser une question (CDC)
router.post('/:id/questions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const productId = param(req, 'id');
    const userId = req.user!.id;
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: { message: 'question requise' } });
    }
    const q = await productQuestionService.create(productId, userId, question.trim());
    res.status(201).json({ success: true, data: q });
  } catch (error: any) {
    next(error);
  }
});

export default router;
