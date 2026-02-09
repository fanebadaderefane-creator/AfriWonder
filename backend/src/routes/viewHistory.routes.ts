import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

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
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { video_id: videoId, watch_time_seconds: watchTimeSeconds } = req.body;

    if (!videoId) {
      return res.status(400).json({ success: false, error: 'video_id requis' });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, views: true, creator_id: true },
    });
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    const existing = await prisma.viewHistory.findFirst({
      where: { user_id: userId, video_id: videoId },
    });
    if (existing) {
      await prisma.viewHistory.update({
        where: { id: existing.id },
        data: { created_at: new Date() },
      });
    } else {
      await prisma.viewHistory.create({
        data: { user_id: userId, video_id: videoId },
      });
    }
    await prisma.video.update({
      where: { id: videoId },
      data: { views: video.views + 1 },
    });

    res.json({ success: true, data: { video_id: videoId, views: video.views + 1 } });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
