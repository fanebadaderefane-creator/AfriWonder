import { Router } from 'express';
import * as leaderboardService from '../services/leaderboard.service.js';

const router = Router();

// GET /api/leaderboard?range=all|weekly|monthly|annual&country=&category=&limit=
router.get('/', async (req, res, next) => {
  try {
    const range = (req.query.range as string) || 'all';
    const country = req.query.country as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await leaderboardService.getLeaderboard({
      period: range as 'all' | 'weekly' | 'monthly' | 'annual',
      country,
      category,
      limit,
    });

    if (result.leaderboard.length === 0) {
      const fallback = await leaderboardService.getLeaderboardFromUserLevel({
        limit,
        country,
        category,
      });
      return res.json({ success: true, ...fallback });
    }

    res.json({ success: true, ...result });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
