import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// GET /api/view-history — liste des vidéos vues par l'utilisateur connecté
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    const history = await prisma.viewHistory.findMany({
      where: { user_id: userId },
      include: { video: true },
      orderBy: { created_at: order },
      take: limit,
    });

    res.json({ success: true, data: history });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/view-history — enregistrer une vue (upsert + incrémenter views sur la vidéo)
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      video_id: videoId,
      watch_time_seconds: watchTimeSeconds,
      watch_percent: watchPercent,
      completed: completedBody,
    } = req.body;

    if (!videoId) {
      return res.status(400).json({ success: false, error: 'video_id requis' });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, views: true, creator_id: true, category: true },
    });
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    const watchSec = watchTimeSeconds != null ? Number(watchTimeSeconds) : undefined;
    const pct = watchPercent != null ? Number(watchPercent) : undefined;
    const completed = completedBody != null ? Boolean(completedBody) : (pct != null && pct >= 80);

    const existing = await prisma.viewHistory.findFirst({
      where: { user_id: userId, video_id: videoId },
    });
    if (existing) {
      await prisma.viewHistory.update({
        where: { id: existing.id },
        data: {
          ...(watchSec != null && { watch_seconds: Math.round(watchSec) }),
          ...(pct != null && { watch_percent: pct }),
          completed,
          ...(video.category != null && { category: video.category }),
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.viewHistory.create({
        data: {
          user_id: userId,
          video_id: videoId,
          ...(watchSec != null && { watch_seconds: Math.round(watchSec) }),
          ...(pct != null && { watch_percent: pct }),
          completed,
          ...(video.category != null && { category: video.category }),
        },
      });
    }
    // Ne pas incrémenter views ici : POST /videos/:id/view (recordView) est la source de vérité pour les vues
    res.json({ success: true, data: { video_id: videoId } });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
