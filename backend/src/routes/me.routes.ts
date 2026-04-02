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

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

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
        select: { video_id: true },
      }),
      prisma.save.findMany({
        where: {
          user_id: userId,
          video_id: { in: ids },
        },
        select: { video_id: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        likedIds: likes.map((row) => row.video_id),
        savedIds: saves.map((row) => row.video_id),
      },
    });
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
