import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import userService from '../services/user.service.js';

const router = Router();

// GET /api/users - Liste des utilisateurs
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.list(page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const requesterId = req.user?.id;
    const user = await userService.getById(userId, requesterId);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getFollowers(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/following
router.get('/:id/following', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getFollowing(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const followingId = param(req, 'id');
    const followerId = req.user!.id;
    const result = await userService.toggleFollow(followerId, followingId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/stats
router.get('/:id/stats', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const result = await userService.getUserStats(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/liked-videos - Récupérer les vidéos likées d'un utilisateur
router.get('/:id/liked-videos', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const page = parseInt(req.query.page as string) || 1;
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam) : 0;
    const result = await userService.getLikedVideos(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/users/me
router.put('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await userService.updateProfile(userId, req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

export default router;

