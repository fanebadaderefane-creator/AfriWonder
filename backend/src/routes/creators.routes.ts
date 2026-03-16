import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/creators/me — CPO 7.32 : périmètre créateur (stats pour le créateur connecté)
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [videoCount, followerCount, subscriptionTier, productCount] = await Promise.all([
      prisma.video.count({ where: { user_id: userId } }),
      prisma.follow.count({ where: { following_id: userId } }),
      prisma.creatorSubscription.findFirst({
        where: { creator_id: userId, status: 'active', expires_at: { gte: new Date() } },
        orderBy: { expires_at: 'desc' },
        select: { tier: true },
      }),
      prisma.product.count({ where: { seller_id: userId, status: 'active' } }),
    ]);
    res.json({
      success: true,
      data: {
        creator_id: userId,
        video_count: videoCount,
        follower_count: followerCount,
        subscription_tier: subscriptionTier?.tier ?? null,
        product_count: productCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/creators/:id/merchandising — produits merchandising du créateur (is_merchandising = true)
router.get('/:id/merchandising', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = param(req, 'id');
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { seller_id: creatorId, status: 'active', is_merchandising: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          images: true,
          category: true,
          product_type: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: { seller_id: creatorId, status: 'active', is_merchandising: true } }),
    ]);
    res.json({
      success: true,
      data: { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/creators/:id/store — produits vendus par le créateur (marketplace créateur)
router.get('/:id/store', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = param(req, 'id');
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { seller_id: creatorId, status: 'active' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          images: true,
          category: true,
          product_type: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: { seller_id: creatorId, status: 'active' } }),
    ]);

    res.json({
      success: true,
      data: { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/creators/:id/fan-club — infos communauté / abo créateur (tier + wonder count)
router.get('/:id/fan-club', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = param(req, 'id');
    const [creator, subscription, wonderCount, followerCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: creatorId },
        select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true },
      }),
      prisma.creatorSubscription.findFirst({
        where: { creator_id: creatorId, status: 'active', expires_at: { gte: new Date() } },
        orderBy: { expires_at: 'desc' },
        select: { tier: true, status: true, expires_at: true },
      }),
      prisma.wonderRelation.count({ where: { creator_id: creatorId, status: 'active' } }),
      prisma.follow.count({ where: { following_id: creatorId } }),
    ]);

    if (!creator) {
      return res.status(404).json({ success: false, error: { message: 'Créateur non trouvé' } });
    }

    res.json({
      success: true,
      data: {
        creator,
        subscription: subscription
          ? {
              tier: subscription.tier,
              status: subscription.status,
              expires_at: subscription.expires_at?.toISOString() ?? null,
            }
          : null,
        wonder_count: wonderCount,
        follower_count: followerCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
