import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import cartService from '../services/cart.service.js';
import { validateBody } from '../utils/zodValidation.js';
import {
  cartAddBodySchema,
  cartCouponBodySchema,
  cartUpdateBodySchema,
} from '../schemas/cartProductsNotifications.schemas.js';

const router = Router();

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Recuperer le panier utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panier retourne
 *
 * /api/cart/add:
 *   post:
 *     tags: [Cart]
 *     summary: Ajouter un produit au panier
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Panier mis a jour
 */

// GET /api/cart
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cart = await cartService.getCart(req.user!.id);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/cart/breakdown — panier + frais par vendeur (10% plateforme)
router.get('/breakdown', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const breakdown = await cartService.getCartWithFeesBreakdown(req.user!.id);
    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/cart/add
router.post('/add', authenticate, validateBody(cartAddBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addItem(req.user!.id, productId, quantity);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/cart/remove/:productId
router.delete('/remove/:productId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cart = await cartService.removeItem(req.user!.id, param(req, 'productId'));
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/cart/update
router.put('/update', authenticate, validateBody(cartUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.updateQuantity(req.user!.id, productId, quantity);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/cart/clear
router.delete('/clear', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user!.id);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/cart/coupon
router.post('/coupon', authenticate, validateBody(cartCouponBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { couponCode } = req.body;
    const cart = await cartService.applyCoupon(req.user!.id, couponCode);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

export default router;
