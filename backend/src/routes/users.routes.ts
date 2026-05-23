import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import userService from '../services/user.service.js';
import liveService from '../services/live.service.js';
import { invalidateUserFeedCaches } from '../services/feedCache.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import privacyService from '../services/privacy.service.js';
import { privacyDeleteAccountSchema } from '../schemas/highRiskBodies.js';

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

// GET /api/users/me/export — export JSON immédiat (RGPD art. 20), avant /:id pour ne pas matcher "me"
router.get('/me/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payload = await privacyService.exportUserData(req.user!.id);
    res.json({ success: true, data: payload });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/users/me — demande de suppression de compte (RGPD art. 17), même logique que POST /api/privacy/delete-account
router.delete('/me', authenticate, validateBody(privacyDeleteAccountSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { reason } = req.body || {};
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';
    const deletionRequest = await privacyService.requestAccountDeletion({
      userId,
      reason,
      ipAddress: ip_address,
    });
    res.json({
      success: true,
      data: deletionRequest,
      message:
        'Demande de suppression enregistrée. Compte définitivement supprimé après le délai légal; annulation possible via le lien fourni par email (quand disponible).',
    });
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
    const viewerId = req.user?.id ?? null;
    const result = await userService.getFollowers(userId, page, limit, viewerId);
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
    const viewerId = req.user?.id ?? null;
    const result = await userService.getFollowing(userId, page, limit, viewerId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/:id/wonder', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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

// GET /api/users/:id/live-gift-hall-of-fame — tops donateurs live (tous les lives du créateur)
router.get('/:id/live-gift-hall-of-fame', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const limit = parseInt(String(req.query.limit || '24'), 10) || 24;
    const rows = await liveService.getGiftHallOfFameForCreator(userId, limit);
    res.json({ success: true, data: { supporters: rows } });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/liked-videos - Récupérer les vidéos likées d'un utilisateur
router.get('/:id/liked-videos', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const viewerId = req.user?.id ?? null;
    const page = parseInt(req.query.page as string) || 1;
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const limitParam = req.query.limit as string;
    const limit = limitParam ? parseInt(limitParam) : 0;
    const result = await userService.getLikedVideos(userId, page, limit, viewerId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/users/:id/share — deep_link + qr_code_data pour partage profil
router.get('/:id/share', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const user = await userService.getById(userId, req.user?.id ?? undefined);
    const handle = (user?.username || '').replace(/^@+/, '');
    const baseUrl = process.env.PUBLIC_WEB_URL?.replace(/\/$/, '') || 'https://afri-wonder.vercel.app';
    const deepLink = handle
      ? `${baseUrl}/u/${encodeURIComponent(handle)}`
      : `${baseUrl}/user/${encodeURIComponent(userId)}`;
    return res.json({
      success: true,
      data: {
        user_id: userId,
        handle,
        deep_link: deepLink,
        qr_code_data: deepLink,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/users/me
router.put('/me', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await userService.updateProfile(userId, req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

export default router;

