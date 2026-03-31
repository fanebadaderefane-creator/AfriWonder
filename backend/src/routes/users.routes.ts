import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import userService from '../services/user.service.js';
import { invalidateUserFeedCaches } from '../services/feedCache.service.js';

const router = Router();

// GET /api/users - Liste des utilisateurs (search: recherche par username, full_name, email)
// optionalAuth: recherche accessible sans login (page Search)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const search = (req.query.search as string)?.trim();
    const result = await userService.list(page, limit, search);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/username/:username — profil public par username (avant /:id)
router.get('/username/:username', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const username = param(req, 'username');
    const requesterId = req.user?.id;
    const user = await userService.getByUsername(username, requesterId);
    res.json({ success: true, data: user });
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
    invalidateUserFeedCaches(followerId).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/users/:id/wonder - Wonder = s'émerveiller avec un créateur (branding Afriwonder)
router.post('/:id/wonder', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = param(req, 'id');
    const followerId = req.user!.id;
    const result = await userService.toggleWonder(followerId, creatorId);
    invalidateUserFeedCaches(followerId).catch(() => {});
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/wonderers - Nombre de Wonderers d'un créateur
router.get('/:id/wonderers', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const creatorId = param(req, 'id');
    const count = await userService.getWonderersCount(creatorId);
    res.json({ success: true, data: { wonderers: count } });
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

