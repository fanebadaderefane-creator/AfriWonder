import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import playlistService from '../services/playlist.service.js';

const router = Router();

// GET /api/playlists
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await playlistService.getUserPlaylists(req.user!.id, page, limit);
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

// POST /api/playlists
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
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
router.post('/:id/videos', authenticate, async (req: AuthRequest, res, next) => {
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

