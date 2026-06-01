// AfriWonder full review PR - CodeRabbit
/**
 * Routes de recherche globale — CDC Super-App AfriWonder.
 * GET /api/search?q=... — recherche unifiée vidéos, utilisateurs, produits.
 * GET /api/search/suggest?q=... — suggestions pour autocomplete.
 */

import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { globalSearch, suggest, GlobalSearchType } from '../services/search.service.js';

const router = Router();

/**
 * GET /api/search
 * Query: q (requis), type (all|videos|users|products|sounds), page, limit, category, hashtag, duration
 */
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const type = (req.query.type as GlobalSearchType) || 'all';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const category = (req.query.category as string) || undefined;
    const hashtag = (req.query.hashtag as string) || undefined;
    const duration = (req.query.duration as 'all' | 'short' | 'medium' | 'long') || undefined;

    const result = await globalSearch({
      q: q.trim(),
      type: ['all', 'videos', 'users', 'products', 'sounds'].includes(type) ? type : 'all',
      page,
      limitPerType: limit,
      category: category?.trim() || undefined,
      hashtag: hashtag?.trim() || undefined,
      userId: req.user?.id,
      viewerId: req.user?.id,
      duration,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/suggest
 * Query: q (requis), limit (optionnel, défaut 8)
 */
router.get('/suggest', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 8));

    const result = await suggest({ q: q.trim(), limit });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
