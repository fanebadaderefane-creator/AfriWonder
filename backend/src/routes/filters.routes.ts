import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/filters — catalogue des filtres vidéo (côté client applique le filtre)
router.get('/', optionalAuth, async (_req, res, next) => {
  try {
    const filters = await prisma.videoFilter.findMany({
      where: { is_active: true },
      select: { id: true, name: true, thumbnail_url: true, config: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: filters });
  } catch (e) {
    next(e);
  }
});

export default router;
