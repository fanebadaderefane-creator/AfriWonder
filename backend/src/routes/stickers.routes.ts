import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/stickers/packs — liste des packs de stickers
router.get('/packs', optionalAuth, async (_req, res, next) => {
  try {
    const packs = await prisma.stickerPack.findMany({
      where: { is_active: true },
      select: { id: true, name: true, thumbnail_url: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: packs });
  } catch (e) {
    next(e);
  }
});

// GET /api/stickers/packs/:id/stickers — stickers d'un pack
router.get('/packs/:id/stickers', optionalAuth, async (req, res, next) => {
  try {
    const packId = param(req, 'id');
    const stickers = await prisma.sticker.findMany({
      where: { pack_id: packId },
      select: { id: true, url: true, emoji: true },
      orderBy: { created_at: 'asc' },
    });
    res.json({ success: true, data: stickers });
  } catch (e) {
    next(e);
  }
});

export default router;
