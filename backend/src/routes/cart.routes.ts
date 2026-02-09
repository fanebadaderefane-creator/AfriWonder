import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import cartService from '../services/cart.service.js';

const router = Router();

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
router.post('/add', authenticate, async (req: AuthRequest, res, next) => {
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
router.put('/update', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/coupon', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { couponCode } = req.body;
    const cart = await cartService.applyCoupon(req.user!.id, couponCode);
    res.json({ success: true, data: cart });
  } catch (error: any) {
    next(error);
  }
});

export default router;

