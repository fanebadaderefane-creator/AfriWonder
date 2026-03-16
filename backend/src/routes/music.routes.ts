import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/music
 * Query: is_public (ignored for now), sort (e.g. -usage_count), limit
 * Returns list of music for editor (e.g. TikTok-style tracks).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const sort = (req.query.sort as string) || '-usage_count';

    const orderBy: { plays_count?: 'asc' | 'desc'; created_at?: 'asc' | 'desc' } =
      sort === '-usage_count' || sort === '-plays_count'
        ? { plays_count: 'desc' }
        : sort === 'usage_count' || sort === 'plays_count'
          ? { plays_count: 'asc' }
          : { created_at: 'desc' };

    const list = await prisma.music.findMany({
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        artist: true,
        album: true,
        duration: true,
        audio_url: true,
        cover_url: true,
        genre: true,
        plays_count: true,
        created_at: true,
      },
    });

    const data = list.map((m) => ({
      ...m,
      usage_count: m.plays_count,
    }));

    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Music list error:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur', data: [] });
  }
});

/**
 * POST /api/music — création de piste (authentifié)
 * Body: title, artist, album?, duration, audio_url, cover_url?, genre?
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, artist, album, duration, audio_url, cover_url, genre } = req.body;
    if (!title || !artist || duration == null || !audio_url) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis: title, artist, duration, audio_url',
      });
    }
    const music = await prisma.music.create({
      data: {
        title,
        artist,
        album: album || null,
        duration: Number(duration),
        audio_url,
        cover_url: cover_url || null,
        genre: genre || null,
      },
    });
    res.status(201).json({ success: true, data: music });
  } catch (err: any) {
    console.error('Music create error:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;
