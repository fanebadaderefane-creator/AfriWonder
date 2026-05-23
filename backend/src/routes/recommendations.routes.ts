import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/recommendations/videos — fil local ou proxy vers moteur Python (RECOMMENDATION_ENGINE_URL).
 * Query: seed, limit — Phase 4 : brancher TF.js côté client ou service Python.
 */
router.get('/videos', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const seedId = typeof req.query.seed === 'string' ? req.query.seed : undefined;

    const engineBase = process.env.RECOMMENDATION_ENGINE_URL?.trim();
    if (engineBase) {
      try {
        const q = new URLSearchParams({ limit: String(limit) });
        if (seedId) q.set('seed', seedId);
        if (req.user?.id) q.set('user_id', req.user.id);
        const u = `${engineBase.replace(/\/$/, '')}/videos?${q.toString()}`;

        const auth = req.headers.authorization;
        const r = await fetch(u, {
          method: 'GET',
          headers: {
            ...(auth ? { Authorization: auth } : {}),
            'Content-Type': 'application/json',
            ...(process.env.RECOMMENDATION_ENGINE_KEY
              ? { 'X-Api-Key': process.env.RECOMMENDATION_ENGINE_KEY }
              : {}),
          },
          signal: AbortSignal.timeout(8000),
        });

        if (r.ok) {
          const body = (await r.json()) as { data?: unknown; videos?: unknown };
          const payload = body.data ?? body;
          return res.json({
            success: true,
            data: {
              ...(typeof payload === 'object' && payload !== null ? payload : { videos: [] }),
              algo: 'external_python_v1',
            },
          });
        }
        logger.warn('RECOMMENDATION_ENGINE_URL non OK', { status: r.status });
      } catch (e) {
        logger.warn('RECOMMENDATION_ENGINE_URL indisponible, fallback local', {
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }

    let category: string | undefined;
    if (seedId) {
      const v = await prisma.video.findUnique({
        where: { id: seedId },
        select: { category: true },
      });
      category = v?.category || undefined;
    }

    const where: { visibility: string; category?: string } = { visibility: 'public' };
    if (category) where.category = category;

    const videos = await prisma.video.findMany({
      where,
      orderBy: [{ views: 'desc' }, { created_at: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        thumbnail_url: true,
        video_url: true,
        views: true,
        likes: true,
        creator_id: true,
        category: true,
        created_at: true,
      },
    });

    res.json({
      success: true,
      data: {
        videos,
        algo: 'views_popularity_v1',
        hint: 'Définir RECOMMENDATION_ENGINE_URL pour un service Python ; ou embeddings côté client (TensorFlow.js).',
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
