import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import playlistService from '../services/playlist.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const playlistPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.union([z.string().max(2000), z.null()]).optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Au moins un champ requis' });

const router = Router();

// GET /api/playlists
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const targetUserId = typeof req.query.user_id === 'string' ? String(req.query.user_id).trim() : '';
    const viewerUserId = req.user?.id ?? null;

    if (!targetUserId && !viewerUserId) {
      return res.status(401).json({ success: false, error: { message: 'Connexion requise' } });
    }

    const result = await playlistService.getUserPlaylists({
      targetUserId: targetUserId || String(viewerUserId),
      viewerUserId,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/playlists/:id
router.get('/:id', async (req, res, next) => {
  try {
    const playlist = await playlistService.getPlaylist(param(req, 'id'));
    res.json({ success: true, data: playlist });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/playlists/:id
router.patch('/:id', authenticate, validateBody(playlistPatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, description, isPublic } = req.body as {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
    };
    const playlist = await playlistService.update(param(req, 'id'), req.user!.id, {
      name,
      description,
      isPublic,
    });
    res.json({ success: true, data: playlist });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/playlists
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, description, isPublic } = req.body;
    const playlist = await playlistService.create(req.user!.id, {
      name,
      description,
      isPublic,
    });
    res.json({ success: true, data: playlist });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/playlists/:id/videos
router.post('/:id/videos', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { videoId } = req.body;
    const item = await playlistService.addVideo(param(req, 'id'), req.user!.id, videoId);
    res.json({ success: true, data: item });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/playlists/:id/videos/:videoId
router.delete('/:id/videos/:videoId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await playlistService.removeVideo(param(req, 'id'), req.user!.id, param(req, 'videoId'));
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await playlistService.delete(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

export default router;

