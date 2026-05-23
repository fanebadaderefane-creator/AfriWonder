import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/zodValidation.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

const pinSchema = z.object({
  product_id: z.string().uuid(),
  order_index: z.number().int().min(0).max(99).optional(),
  is_flash_deal: z.boolean().optional(),
  flash_price: z.number().positive().optional(),
  flash_ends_at: z.string().optional(),
});

// GET /api/live-commerce/:liveId/products — liste des produits épinglés
router.get('/:liveId/products', optionalAuth, async (req, res, next) => {
  try {
    const liveId = param(req, 'liveId');
    const pins = await prisma.livePinnedProduct.findMany({
      where: { live_stream_id: liveId },
      include: { product: true },
      orderBy: { order_index: 'asc' },
    });
    res.json({ success: true, data: pins });
  } catch (err) { next(err); }
});

// POST /api/live-commerce/:liveId/pin — créateur/modérateur épingle un produit
router.post('/:liveId/pin', authenticate, validateBody(pinSchema), async (req: AuthRequest, res, next) => {
  try {
    const liveId = param(req, 'liveId');
    const body = req.body as z.infer<typeof pinSchema>;
    const live = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!live) return res.status(404).json({ success: false, error: 'Live introuvable.' });
    if (live.creator_id !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Seul le créateur peut épingler un produit.' });
    }
    const pin = await prisma.livePinnedProduct.upsert({
      where: {
        live_stream_id_product_id: { live_stream_id: liveId, product_id: body.product_id },
      },
      create: {
        live_stream_id: liveId,
        product_id: body.product_id,
        pinned_by: req.user!.id,
        order_index: body.order_index ?? 0,
        is_flash_deal: body.is_flash_deal ?? false,
        flash_price: body.flash_price,
        flash_ends_at: body.flash_ends_at ? new Date(body.flash_ends_at) : null,
      },
      update: {
        order_index: body.order_index ?? 0,
        is_flash_deal: body.is_flash_deal ?? false,
        flash_price: body.flash_price,
        flash_ends_at: body.flash_ends_at ? new Date(body.flash_ends_at) : null,
      },
      include: { product: true },
    });
    return res.status(201).json({ success: true, data: pin });
  } catch (err) { return next(err); }
});

// DELETE /api/live-commerce/:liveId/pin/:productId — retirer
router.delete('/:liveId/pin/:productId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const liveId = param(req, 'liveId');
    const productId = param(req, 'productId');
    const live = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!live) return res.status(404).json({ success: false, error: 'Live introuvable.' });
    if (live.creator_id !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Seul le créateur peut retirer un produit.' });
    }
    await prisma.livePinnedProduct.deleteMany({
      where: { live_stream_id: liveId, product_id: productId },
    });
    return res.json({ success: true });
  } catch (err) { return next(err); }
});

// POST /api/live-commerce/:liveId/pin/:productId/click — incrémenter clics (analytics)
router.post('/:liveId/pin/:productId/click', optionalAuth, async (req, res, next) => {
  try {
    const liveId = param(req, 'liveId');
    const productId = param(req, 'productId');
    await prisma.livePinnedProduct.updateMany({
      where: { live_stream_id: liveId, product_id: productId },
      data: { clicks_count: { increment: 1 } },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
