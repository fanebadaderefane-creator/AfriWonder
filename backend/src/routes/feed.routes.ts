// AfriWonder full review PR - CodeRabbit
/**
 * Feed combiné : vidéos + publicités In-Feed (1 pub / 4-5 contenus)
 */
import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { feedService } from '../services/feed.service.js';
import { responseCache } from '../middleware/responseCache.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/feed - Feed combiné vidéos + pubs (cache court par utilisateur pour perfs)
const FEED_MAX_LIMIT = 100;
const FEED_CACHE_TTL_MS = 45_000; // 45 s
const FEED_SLOW_REQUEST_MS = 600;
router.get('/', optionalAuth, responseCache('feed:', { ttlMs: FEED_CACHE_TTL_MS, byUser: true }), async (req: AuthRequest, res, next) => {
  const startedAt = Date.now();
  const { page = '1', limit = '50', category, hashtag, mediaType } = req.query;
  const userId = req.user?.id;
  const rawLimit = parseInt(limit as string) || 50;
  const cappedLimit = Math.min(Math.max(1, rawLimit), FEED_MAX_LIMIT);
  const mediaTypeFilter = mediaType === 'image' || mediaType === 'video' ? mediaType : undefined;
  const pageNum = parseInt(page as string) || 1;
  const q = req.query as Record<string, unknown>;
  const refreshRaw = q.refresh ?? q._;
  const refreshNonce =
    refreshRaw != null && String(refreshRaw).trim() !== '' ? String(refreshRaw) : undefined;
  try {
    const deviceId = (req.headers['x-device-id'] as string) || undefined;
    const country = (req.headers['x-country'] as string) || undefined;

    const result = await feedService.getFeed({
      page: pageNum,
      limit: cappedLimit,
      userId,
      deviceId,
      country,
      category: category as string,
      hashtag: hashtag as string,
      mediaType: mediaTypeFilter,
      refreshNonce,
    });

    const durationMs = Date.now() - startedAt;
    // Avant res.json uniquement : après envoi, setHeader lève "Cannot set headers after they are sent" (crash du processus).
    res.setHeader('Server-Timing', `feed;dur=${durationMs}`);
    // Clients mobiles / PWA: autorise un repli court sur cache intermédiaire côté navigateur/edge.
    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    if (durationMs >= FEED_SLOW_REQUEST_MS) {
      logger.warn('Slow feed request', {
        userId,
        page: pageNum,
        limit: cappedLimit,
        durationMs,
        category: category as string | undefined,
        hashtag: hashtag as string | undefined,
        mediaType: mediaTypeFilter,
      });
    }

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
