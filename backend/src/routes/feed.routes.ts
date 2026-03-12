// AfriWonder full review PR - CodeRabbit
/**
 * Feed combiné : vidéos + publicités In-Feed (1 pub / 4-5 contenus)
 */
import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { feedService } from '../services/feed.service.js';
import { responseCache } from '../middleware/responseCache.middleware.js';

const router = Router();

// GET /api/feed - Feed combiné vidéos + pubs (cache court par utilisateur pour perfs)
const FEED_MAX_LIMIT = 100;
const FEED_CACHE_TTL_MS = 45_000; // 45 s
router.get('/', optionalAuth, responseCache('feed:', { ttlMs: FEED_CACHE_TTL_MS, byUser: true }), async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50', category, hashtag } = req.query;
    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || undefined;
    const country = (req.headers['x-country'] as string) || undefined;
    const rawLimit = parseInt(limit as string) || 50;
    const cappedLimit = Math.min(Math.max(1, rawLimit), FEED_MAX_LIMIT);

    const result = await feedService.getFeed({
      page: parseInt(page as string) || 1,
      limit: cappedLimit,
      userId,
      deviceId,
      country,
      category: category as string,
      hashtag: hashtag as string,
    });

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
