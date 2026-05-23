import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import userService from '../services/user.service.js';
import loyaltyService from '../services/loyalty.service.js';
import travelAlertService from '../services/travelAlert.service.js';
import groupBuyService from '../services/groupBuy.service.js';
import experimentService from '../services/experiment.service.js';
import * as virtualCardService from '../services/virtualCard.service.js';
import * as internationalTransferService from '../services/internationalTransfer.service.js';
import * as paymentPreauthService from '../services/paymentPreauth.service.js';
import * as creatorContractService from '../services/creatorContract.service.js';
import { listMyCallHistory } from '../services/meCallHistory.service.js';
import privacyService from '../services/privacy.service.js';
import { getRecentContactMatchIds } from './friends.routes.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import { z } from 'zod';

const router = Router();

const meSecuritySettingsPatchSchema = z.object({
  login_alerts_enabled: z.boolean(),
});
const PRIVACY_SETTINGS_KEY = (userId: string) => `privacy_settings:${userId}`;
const PRIVACY_DEFAULTS = {
  private_account: false,
  following_list_visibility: 'everyone',
  liked_videos_visibility: 'only_me',
  comments: { who: 'everyone', filter_keywords: [] as string[] },
  mentions: 'everyone',
  direct_messages: 'friends',
  /** Audience qui voit le statut "en ligne" / `last_seen` (everyone | friends | no_one). */
  activity_status: 'no_one',
  viewers: true,
  downloads: true,
  display_profile_when_sharing: true,
  reuse_of_content: { duet: true, stitch: true, remix: true },
  content_preferences: { disliked_tags: [] as string[] },
  time_and_wellbeing: { screen_time_limit_min: null as number | null, break_reminder_min: null as number | null, restricted_mode: false },
  language: { app_lang: 'fr', content_lang: ['fr'] as string[] },
  display: { theme: 'system' },
  accessibility: { auto_captions: false, reduce_motion: false, tts: false },
  contacts_and_location: { contacts_allowed: false, location_allowed: false },
  data_saver: false,
};

// GET /api/me/export — export JSON données personnelles (RGPD art. 20)
router.get('/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payload = await privacyService.exportUserData(req.user!.id);
    res.json({ success: true, data: payload });
  } catch (e) {
    next(e);
  }
});

// ——— Liste proches / close friends (CPO 1.18) ———
// GET /api/me/close-friends
router.get('/close-friends', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await prisma.closeFriend.findMany({
      where: { user_id: userId },
      include: { friend: { select: { id: true, username: true, full_name: true, profile_image: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: list.map((r) => r.friend) });
  } catch (e) {
    next(e);
  }
});

// POST /api/me/close-friends — ajouter un proche (body: friend_id)
router.post('/close-friends', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const friendId = req.body?.friend_id;
    if (!friendId || friendId === userId) {
      return res.status(400).json({ success: false, error: { message: 'friend_id requis et différent de vous' } });
    }
    const existing = await prisma.closeFriend.findUnique({
      where: { user_id_friend_id: { user_id: userId, friend_id: friendId } },
    });
    if (existing) return res.json({ success: true, data: existing, message: 'Déjà dans la liste' });
    const close = await prisma.closeFriend.create({
      data: { user_id: userId, friend_id: friendId },
      include: { friend: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    res.status(201).json({ success: true, data: close.friend });
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(404).json({ success: false, error: { message: 'Utilisateur introuvable' } });
    next(e);
  }
});

// DELETE /api/me/close-friends/:friendId
router.delete('/close-friends/:friendId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const friendId = param(req, 'friendId');
    const deleted = await prisma.closeFriend.deleteMany({
      where: { user_id: userId, friend_id: friendId },
    });
    if (deleted.count === 0) return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    res.json({ success: true, message: 'Retiré de la liste proches' });
  } catch (e) {
    next(e);
  }
});

// ——— Demandes de suivi (CPO 2.2 — compte privé) ———
// GET /api/me/follow-requests
router.get('/follow-requests', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await userService.listFollowRequestsReceived(userId);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// POST /api/me/follow-requests/:id/accept
router.post('/follow-requests/:id/accept', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = param(req, 'id');
    const result = await userService.acceptFollowRequest(requestId, userId);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

// POST /api/me/follow-requests/:id/reject
router.post('/follow-requests/:id/reject', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = param(req, 'id');
    const result = await userService.rejectFollowRequest(requestId, userId);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

// GET /api/me/loyalty — mes points fidélité par vendeur (CPO 10.21)
router.get('/loyalty', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const list = await loyaltyService.listMyLoyalties(userId);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

// GET /api/me/suggested-follows — suggestions de comptes à suivre (CPO 2.33)
router.get('/suggested-follows', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 20);
    const list = await userService.getSuggestedUsersToFollow(req.user!.id, limit);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/me/settings/privacy
 * Préférences "Settings and privacy" persistantes par utilisateur.
 */
router.get('/settings/privacy', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [stored, user] = await Promise.all([
      prisma.platformSettings.findUnique({ where: { key: PRIVACY_SETTINGS_KEY(userId) } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { is_private: true, data_saver_mode: true, theme: true, preferred_language: true },
      }),
    ]);
    const saved = ((stored?.value as Record<string, unknown>) || {});
    const settings = {
      ...PRIVACY_DEFAULTS,
      ...saved,
      private_account: typeof user?.is_private === 'boolean' ? user.is_private : PRIVACY_DEFAULTS.private_account,
      data_saver: typeof user?.data_saver_mode === 'boolean' ? user.data_saver_mode : PRIVACY_DEFAULTS.data_saver,
      display: {
        ...(PRIVACY_DEFAULTS.display || {}),
        ...(((saved.display as Record<string, unknown>) || {})),
        theme: (user?.theme || (saved.display as Record<string, unknown> | undefined)?.theme || 'system') as string,
      },
      language: {
        ...(PRIVACY_DEFAULTS.language || {}),
        ...(((saved.language as Record<string, unknown>) || {})),
        app_lang: (user?.preferred_language || (saved.language as Record<string, unknown> | undefined)?.app_lang || 'fr') as string,
      },
    };
    return res.json({ success: true, data: settings });
  } catch (e) {
    return next(e);
  }
});

/**
 * PUT /api/me/settings/privacy
 * Sauvegarde des préférences + synchronisation des champs User supportés nativement.
 */
router.put('/settings/privacy', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const payload = (req.body || {}) as Record<string, unknown>;
    const current = await prisma.platformSettings.findUnique({ where: { key: PRIVACY_SETTINGS_KEY(userId) } });
    const previous = ((current?.value as Record<string, unknown>) || {});
    const merged = { ...PRIVACY_DEFAULTS, ...previous, ...payload };

    await prisma.platformSettings.upsert({
      where: { key: PRIVACY_SETTINGS_KEY(userId) },
      create: { key: PRIVACY_SETTINGS_KEY(userId), value: merged },
      update: { value: merged },
    });

    const userPatch: Record<string, unknown> = {};
    if (typeof merged.private_account === 'boolean') userPatch.is_private = merged.private_account;
    if (typeof merged.data_saver === 'boolean') userPatch.data_saver_mode = merged.data_saver;
    const display = (merged.display as Record<string, unknown> | undefined) || {};
    if (typeof display.theme === 'string') userPatch.theme = display.theme;
    const language = (merged.language as Record<string, unknown> | undefined) || {};
    if (typeof language.app_lang === 'string') userPatch.preferred_language = language.app_lang;
    if (Object.keys(userPatch).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userPatch });
    }

    return res.json({ success: true, data: merged });
  } catch (e) {
    return next(e);
  }
});

/** GET /api/me/settings/blocked — liste des comptes bloqués. */
router.get('/settings/blocked', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const blocks = await prisma.userBlock.findMany({
      where: { blocker_id: userId },
      include: { blocked: { select: { id: true, username: true, full_name: true, profile_image: true } } },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: blocks.map((b) => b.blocked) });
  } catch (e) {
    return next(e);
  }
});

/** DELETE /api/me/settings/blocked/:id — débloquer un compte. */
router.delete('/settings/blocked/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const targetId = param(req, 'id');
    await prisma.userBlock.deleteMany({ where: { blocker_id: userId, blocked_id: targetId } });
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /api/me/friends-suggestions — suggestions enrichies pour l'écran « Find friends ».
 *
 * Renvoie les mêmes comptes que `suggested-follows`, mais enrichis avec :
 *  - `preview_videos` : jusqu'à 4 dernières vidéos publiques (id, thumbnail_url, video_url,
 *    created_at) pour afficher la bande de 4 aperçus 9:16 sous le nom,
 *  - `mutual_count` : nombre d'amis en commun (estimé via abonnements croisés),
 *  - `is_new_content` : true si au moins une vidéo publiée dans les dernières 24 h.
 */
router.get('/friends-suggestions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(60, parseInt(String(req.query.limit), 10) || 24);
    const users = await userService.getSuggestedUsersToFollow(userId, limit);
    if (users.length === 0) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const userIds = users.map((u) => u.id);
    const [myFollowingRows, followingMeRows, previewVideos, mutualRows] = await Promise.all([
      prisma.follow.findMany({ where: { follower_id: userId }, select: { following_id: true } }),
      prisma.follow.findMany({
        where: {
          follower_id: { in: userIds },
          following_id: userId,
        },
        select: { follower_id: true },
      }),
      prisma.video.findMany({
        where: {
          creator_id: { in: userIds },
          visibility: 'public',
          video_url: { not: { contains: 'example.com' } },
        },
        select: {
          id: true,
          creator_id: true,
          thumbnail_url: true,
          video_url: true,
          media_type: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: userIds.length * 4,
      }),
      prisma.follow.findMany({
        where: { following_id: { in: userIds } },
        select: { follower_id: true, following_id: true },
      }),
    ]);

    const myFollowing = new Set(myFollowingRows.map((f) => f.following_id));
    const followsMe = new Set(followingMeRows.map((f) => f.follower_id));
    const videosByUser = new Map<string, typeof previewVideos>();
    for (const v of previewVideos) {
      const arr = videosByUser.get(v.creator_id) || [];
      if (arr.length < 4) arr.push(v);
      videosByUser.set(v.creator_id, arr);
    }
    const mutualByUser = new Map<string, number>();
    for (const row of mutualRows) {
      if (myFollowing.has(row.follower_id)) {
        mutualByUser.set(row.following_id, (mutualByUser.get(row.following_id) || 0) + 1);
      }
    }

    const DAY_AGO = Date.now() - 24 * 3600 * 1000;

    /** Ids trouvés récemment via la synchro contacts (24 h) — badge « From your contacts ». */
    const contactMatchIds = getRecentContactMatchIds(userId);

    const suggestions = users.map((u) => {
      const videos = videosByUser.get(u.id) || [];
      const fromContacts = contactMatchIds.has(u.id);
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        profile_image: u.profile_image,
        is_verified: u.is_verified,
        followers_count: u._count?.follows || 0,
        mutual_count: mutualByUser.get(u.id) || 0,
        is_following_me: followsMe.has(u.id),
        is_new_content: videos.some((v) => v.created_at.getTime() >= DAY_AGO),
        /** `contacts` (match via /friends/contacts/sync), `mutual` (amis en commun), ou `algo` (par défaut). */
        source: fromContacts ? ('contacts' as const) : mutualByUser.get(u.id) ? ('mutual' as const) : ('algo' as const),
        preview_videos: videos.map((v) => ({
          id: v.id,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          media_type: v.media_type,
          created_at: v.created_at,
        })),
      };
    });

    return res.json({ success: true, data: { suggestions } });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /api/me/friends-suggestions/:id/dismiss — retirer un compte des suggestions.
 * Marque une suggestion comme "rejetée" (24 h) via cache en mémoire.
 */
const DISMISSED_CACHE = new Map<string, Map<string, number>>();
const DISMISS_TTL_MS = 24 * 3600 * 1000;

router.post('/friends-suggestions/:id/dismiss', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const targetId = (typeof req.params.id === 'string' ? req.params.id : '').trim();
    if (!targetId) return res.status(400).json({ success: false, error: 'id requis' });
    let userCache = DISMISSED_CACHE.get(userId);
    if (!userCache) {
      userCache = new Map();
      DISMISSED_CACHE.set(userId, userCache);
    }
    userCache.set(targetId, Date.now());
    // Purge entrées expirées
    const now = Date.now();
    for (const [k, ts] of userCache.entries()) {
      if (now - ts > DISMISS_TTL_MS) userCache.delete(k);
    }
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
});

// GET /api/me/feed-video-states?ids=a,b,c — états like/save pour la fenêtre visible du feed
router.get('/feed-video-states', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const rawIds = String(req.query.ids || '');
    const ids = rawIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (ids.length === 0) {
      return res.json({ success: true, data: { likedIds: [], savedIds: [] } });
    }

    const [likes, saves] = await Promise.all([
      prisma.like.findMany({
        where: {
          user_id: userId,
          video_id: { in: ids },
        },
        select: { video_id: true, type: true },
      }),
      prisma.save.findMany({
        where: {
          user_id: userId,
          video_id: { in: ids },
        },
        select: { video_id: true },
      }),
    ]);

    const reactionsByVideoId: Record<string, string> = {};
    for (const row of likes) {
      reactionsByVideoId[row.video_id] = row.type || 'like';
    }

    res.json({
      success: true,
      data: {
        likedIds: likes.map((row) => row.video_id),
        savedIds: saves.map((row) => row.video_id),
        reactionsByVideoId,
      },
    });
  } catch (e) {
    next(e);
  }
});

/** FYP 4.2 — « Pas intéressé » : pénalise la vidéo dans l’algo (Analytics + invalidation cache prefs feed). */
router.post('/feed/not-interested', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const videoId = String(req.body?.video_id || req.body?.videoId || '').trim();
    if (!videoId) {
      return res.status(400).json({ success: false, error: { message: 'video_id requis' } });
    }
    const exists = await prisma.video.findFirst({
      where: { id: videoId },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ success: false, error: { message: 'Vidéo introuvable' } });
    }
    await prisma.analytics.create({
      data: {
        user_id: req.user!.id,
        entity_type: 'video',
        entity_id: videoId,
        metric_type: 'feed_not_interested',
        metric_value: 1,
        metadata: { source: 'fyp' },
      },
    });
    const { invalidateUserFeedCaches } = await import('../services/feedCache.service.js');
    invalidateUserFeedCaches(req.user!.id).catch(() => {});
    res.status(201).json({ success: true, data: { video_id: videoId } });
  } catch (e) {
    next(e);
  }
});

// GET /api/me/activity — historique d'activité récente (CPO 1.15 : connexions, publications, achats, notifications)
router.get('/activity', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
    const [notifications, sessions, posts, orders] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: { id: true, type: true, title: true, message: true, created_at: true, is_read: true, reference_id: true, reference_type: true },
      }),
      prisma.userSession.findMany({
        where: { user_id: userId },
        orderBy: { last_seen: 'desc' },
        take: 20,
        select: { id: true, device_id: true, user_agent: true, last_seen: true, created_at: true },
      }),
      prisma.post.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 30,
        select: { id: true, text: true, image_url: true, created_at: true, visibility: true },
      }),
      prisma.order.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 30,
        select: { id: true, total_amount: true, currency: true, status: true, created_at: true },
      }),
    ]);

    type ActivityItem = {
      type: 'notification' | 'connection' | 'publication' | 'purchase';
      id: string;
      date: Date;
      title?: string;
      description?: string;
      meta?: Record<string, unknown>;
    };
    const items: ActivityItem[] = [
      ...notifications.map((n) => ({
        type: 'notification' as const,
        id: n.id,
        date: n.created_at,
        title: n.title ?? undefined,
        description: n.message ?? undefined,
        meta: { is_read: n.is_read, notification_type: n.type, reference_id: n.reference_id, reference_type: n.reference_type },
      })),
      ...sessions.map((s) => ({
        type: 'connection' as const,
        id: s.id,
        date: s.last_seen ?? s.created_at,
        description: s.user_agent || s.device_id || 'Connexion',
        meta: { device_id: s.device_id },
      })),
      ...posts.map((p) => ({
        type: 'publication' as const,
        id: p.id,
        date: p.created_at,
        description: p.text?.slice(0, 80) || 'Publication',
        meta: { visibility: p.visibility, has_image: !!p.image_url },
      })),
      ...orders.map((o) => ({
        type: 'purchase' as const,
        id: o.id,
        date: o.created_at,
        title: `Commande ${o.id.slice(0, 8)}`,
        description: `${o.total_amount} ${o.currency} — ${o.status}`,
        meta: { total_amount: o.total_amount, currency: o.currency, status: o.status },
      })),
    ];
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const data = items.slice(0, limit);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

// GET /api/me/sessions — liste des sessions / appareils connectés (multi-device)
router.get('/sessions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.userSession.findMany({
      where: { user_id: userId },
      select: { id: true, device_id: true, user_agent: true, last_seen: true, created_at: true },
      orderBy: { last_seen: 'desc' },
    });
    res.json({ success: true, data: sessions });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/me/sessions/:id — révoquer une session
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = param(req, 'id');
    const userId = req.user!.id;
    const deleted = await prisma.userSession.deleteMany({
      where: { id: sessionId, user_id: userId },
    });
    if (deleted.count === 0) {
      return res.status(404).json({ success: false, error: { message: 'Session non trouvée' } });
    }
    res.json({ success: true, message: 'Session révoquée' });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/me/settings/security — alertes de connexion (e-mail si nouvelle empreinte)
router.patch(
  '/settings/security',
  authenticate,
  validateBody(meSecuritySettingsPatchSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { login_alerts_enabled } = req.body as z.infer<typeof meSecuritySettingsPatchSchema>;
      await prisma.user.update({
        where: { id: userId },
        data: { login_alerts_enabled },
      });
      res.json({ success: true, data: { login_alerts_enabled } });
    } catch (e) {
      next(e);
    }
  }
);

// GET /api/me/call-history — journal 1-1 + appels groupe (CDC Appels)
router.get('/call-history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await listMyCallHistory(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

// CPO 9.33 — Alertes prix voyage
router.get('/travel-alerts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await travelAlertService.listByUser(userId, page, limit);
    res.json({ success: true, data: result.alerts, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
});
router.post('/travel-alerts', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { type, origin, destination, target_price, check_in, check_out } = req.body;
    const alert = await travelAlertService.create({
      user_id: userId,
      type: type || 'flight',
      origin,
      destination,
      target_price: Number(target_price),
      check_in: check_in ? new Date(check_in) : undefined,
      check_out: check_out ? new Date(check_out) : undefined,
    });
    res.status(201).json({ success: true, data: alert });
  } catch (e: any) {
    next(e);
  }
});
router.delete('/travel-alerts/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    await travelAlertService.delete(param(req, 'id'), userId);
    res.json({ success: true, message: 'Alerte supprimée' });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

// CPO 9.25 — Mes groupes d'achat (participations)
router.get('/group-buys', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await groupBuyService.listMy(userId, page, limit);
    res.json({ success: true, data: result.groups, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
});

// CPO 11.36 — Récupérer la variante A/B pour l'utilisateur
router.get('/experiment/:key', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const key = param(req, 'key');
    const userId = req.user!.id;
    const assignment = await experimentService.getAssignment(key, userId);
    res.json({ success: true, data: assignment });
  } catch (e) {
    next(e);
  }
});

// CPO 5.9 — Cartes virtuelles
router.get('/virtual-cards', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const list = await virtualCardService.list(req.user!.id);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});
router.post('/virtual-cards', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const card = await virtualCardService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: card });
  } catch (e) {
    next(e);
  }
});
router.delete('/virtual-cards/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const card = await virtualCardService.revoke(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: card });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

// CPO 5.23 — Transferts internationaux
router.get('/international-transfers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await internationalTransferService.listByUser(req.user!.id, page, limit);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
});
router.post('/international-transfers', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const transfer = await internationalTransferService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: transfer });
  } catch (e: any) {
    if (e?.statusCode === 400) return res.status(400).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
router.get('/international-transfers/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const t = await internationalTransferService.getById(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: t });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

// CPO 5.39 — Préautorisation
router.get('/preauths', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit), 10) || 20));
    const result = await paymentPreauthService.listByUser(req.user!.id, page, limit);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
});
router.post('/preauths', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { amount, order_id, reference, expires_in_hours } = req.body || {};
    const p = await paymentPreauthService.create(req.user!.id, Number(amount), { order_id, reference, expires_in_hours });
    res.status(201).json({ success: true, data: p });
  } catch (e: any) {
    if (e?.statusCode === 400) return res.status(400).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
router.post('/preauths/:id/capture', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const p = await paymentPreauthService.capture(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: p });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
router.post('/preauths/:id/cancel', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const p = await paymentPreauthService.cancel(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: p });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

// CPO 7.19 — Contrats et droits musicaux (créateur)
router.get('/creator-contracts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const list = await creatorContractService.list(req.user!.id);
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
});
router.post('/creator-contracts', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body || {};
    const start_at = body.start_at ? new Date(body.start_at) : undefined;
    const end_at = body.end_at ? new Date(body.end_at) : undefined;
    const contract = await creatorContractService.create(req.user!.id, { ...body, start_at, end_at });
    res.status(201).json({ success: true, data: contract });
  } catch (e: any) {
    if (e?.statusCode === 400) return res.status(400).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
router.patch('/creator-contracts/:id', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body || {};
    if (body.start_at) body.start_at = new Date(body.start_at);
    if (body.end_at) body.end_at = new Date(body.end_at);
    const contract = await creatorContractService.update(param(req, 'id'), req.user!.id, body);
    res.json({ success: true, data: contract });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});
router.delete('/creator-contracts/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await creatorContractService.remove(param(req, 'id'), req.user!.id);
    res.json({ success: true, message: 'Contrat supprimé' });
  } catch (e: any) {
    if (e?.statusCode === 404) return res.status(404).json({ success: false, error: { message: e.message } });
    next(e);
  }
});

export default router;
