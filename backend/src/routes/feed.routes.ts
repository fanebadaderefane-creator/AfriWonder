/**
 * Feed combiné : vidéos + publicités In-Feed (1 pub / 4-5 contenus)
 */
import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { feedService } from '../services/feed.service.js';

const router = Router();

// GET /api/feed - Feed combiné vidéos + pubs
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50', category, hashtag } = req.query;
    const userId = req.user?.id;
    const deviceId = (req.headers['x-device-id'] as string) || undefined;
    const country = (req.headers['x-country'] as string) || undefined;

    const result = await feedService.getFeed({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
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
