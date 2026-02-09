import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import liveService from '../services/live.service.js';

const router = Router();

const giftLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 5,
  message: { success: false, error: 'Trop de cadeaux. Réessayez dans 10 secondes.' },
  keyGenerator: (req: any) => (req.user?.id || req.ip) + ':' + (req.params?.id || ''),
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 2 * 1000,
  max: 1,
  message: { success: false, error: 'Un message toutes les 2 secondes maximum.' },
  keyGenerator: (req: any) => (req.user?.id || req.ip) + ':' + (req.params?.id || ''),
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/live
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.featured !== undefined) filters.featured = req.query.featured === 'true';
    if (req.query.region) filters.region = req.query.region as string;
    if (req.query.language) filters.language = req.query.language as string;
    const result = await liveService.listStreams(page, limit, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/discovery - Découverte: popular | regional | followed | category (auth optionnel pour followed)
router.get('/discovery', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const type = (req.query.type as string) || 'popular';
    const region = req.query.region as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user?.id ?? null;
    const result = await liveService.getDiscovery(userId, { type: type as any, region, category, limit });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/gifts - Catalogue cadeaux (live)
router.get('/gifts', async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const catalog = await liveService.getGiftCatalog(category);
    res.json({ success: true, data: catalog });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/wallet - Mon portefeuille (auth)
router.get('/wallet', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const wallet = await liveService.getWallet(req.user!.id);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/wallet/recharge - B: Recharge portefeuille (Orange Money)
router.post('/wallet/recharge', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const amount = Number(req.body?.amount) || 0;
    const phone = req.body?.phone;
    const result = await liveService.rechargeWallet(req.user!.id, amount, phone);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/wallet/recharge/confirm - B: Callback après paiement recharge
router.get('/wallet/recharge/confirm', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const transactionId = req.query.transactionId as string;
    if (!transactionId) return res.status(400).json({ success: false, error: 'transactionId requis' });
    const result = await liveService.confirmWalletRecharge(transactionId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/creator-level/:userId - Niveau créateur
router.get('/creator-level/:userId', async (req, res, next) => {
  try {
    const level = await liveService.getCreatorLevel(param(req, 'userId'));
    res.json({ success: true, data: level });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/start
router.post('/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, category, streamUrl, thumbnail_url, stream_key, rtmp_url, playback_url, region, language, status, scheduled_at } = req.body;
    const stream = await liveService.createStream(req.user!.id, {
      title,
      description,
      category,
      streamUrl,
      thumbnail_url,
      stream_key,
      rtmp_url,
      playback_url,
      region,
      language,
      status,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    });
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/start-scheduled - Démarrer un live programmé
router.post('/:id/start-scheduled', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stream = await liveService.startScheduledStream(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id
router.get('/:id', async (req, res, next) => {
  try {
    const stream = await liveService.getStream(param(req, 'id'));
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/token - Token stream (Agora si configuré : token, appId, channel, uid)
router.get('/:id/token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const role = (req.query.role as 'host' | 'audience') || 'audience';
    const data = await liveService.getStreamToken(param(req, 'id'), req.user!.id, role);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/join - Viewer rejoint (auth). Body: sessionId?, country? (pour analytics)
router.post('/:id/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.user!.id + Date.now();
    const country = req.body.country;
    const result = await liveService.joinViewer(param(req, 'id'), req.user!.id, String(sessionId), { country });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/leave
router.post('/:id/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.user!.id + Date.now();
    await liveService.leaveViewer(param(req, 'id'), req.user!.id, String(sessionId));
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/heartbeat
router.post('/:id/heartbeat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.user!.id + Date.now();
    await liveService.heartbeatViewer(param(req, 'id'), req.user!.id, String(sessionId));
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/end (body.replay_url optionnel pour D)
router.post('/:id/end', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const replay_url = req.body?.replay_url;
    const stream = await liveService.endStream(param(req, 'id'), req.user!.id, { replay_url });
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/chat (anti-spam 1/2s via chatLimiter)
router.post('/:id/chat', authenticate, chatLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { message } = req.body;
    const chatMessage = await liveService.sendChatMessage(param(req, 'id'), req.user!.id, message);
    res.json({ success: true, data: chatMessage });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/gift (rate limit 5/10s)
router.post('/:id/gift', authenticate, giftLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { giftId, giftName, giftIcon, amount, quantity, message } = req.body;
    const gift = await liveService.sendGift(param(req, 'id'), req.user!.id, {
      giftId,
      giftName,
      giftIcon,
      amount: Number(amount),
      quantity: Number(quantity) || 1,
      message,
    });
    res.json({ success: true, data: gift });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/like
router.post('/:id/like', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await liveService.like(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/top-donors
router.get('/:id/top-donors', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const donors = await liveService.getTopDonors(param(req, 'id'), limit);
    res.json({ success: true, data: donors });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/analytics (créateur uniquement)
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await liveService.getAnalytics(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/moderation
router.get('/:id/moderation', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const settings = await liveService.getModerationSettings(param(req, 'id'));
    res.json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/live/:id/moderation
router.patch('/:id/moderation', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { slow_mode_seconds, comments_enabled, followers_only, banned_words } = req.body;
    const settings = await liveService.updateModerationSettings(param(req, 'id'), req.user!.id, {
      slow_mode_seconds,
      comments_enabled,
      followers_only,
      banned_words,
    });
    res.json({ success: true, data: settings });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/moderators
router.post('/:id/moderators', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    const mod = await liveService.addModerator(param(req, 'id'), req.user!.id, userId);
    res.json({ success: true, data: mod });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/live/:id/moderators/:userId
router.delete('/:id/moderators/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await liveService.removeModerator(param(req, 'id'), req.user!.id, param(req, 'userId'));
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/ban
router.post('/:id/ban', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, reason, durationMinutes, permanent } = req.body;
    const ban = await liveService.banUser(param(req, 'id'), userId, req.user!.id, reason || 'Violation', {
      durationMinutes,
      permanent,
    });
    res.json({ success: true, data: ban });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/live/:id/chat/:messageId
router.delete('/:id/chat/:messageId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await liveService.deleteChatMessage(param(req, 'id'), param(req, 'messageId'), req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/live/:id/chat/:messageId/pin - Épingler / désépingler (body: pin true/false)
router.patch('/:id/chat/:messageId/pin', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const pin = req.body.pin !== false;
    await liveService.pinChatMessage(param(req, 'id'), param(req, 'messageId'), req.user!.id, pin);
    res.json({ success: true, pinned: pin });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/live/:id/replay - Supprimer l’URL de replay (créateur)
router.delete('/:id/replay', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await liveService.deleteReplay(param(req, 'id'), req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/live/:id/replay - Mettre à jour l’URL de replay (créateur ou webhook)
router.patch('/:id/replay', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { replay_url } = req.body;
    const stream = await liveService.updateReplayUrl(param(req, 'id'), req.user!.id, replay_url);
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/cleanup-viewers (cron ou appel périodique)
router.post('/:id/cleanup-viewers', async (req, res, next) => {
  try {
    const count = await liveService.cleanupInactiveViewers(param(req, 'id'));
    res.json({ success: true, data: { removed: count } });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/live/:id/viewers (legacy, pour compat)
router.put('/:id/viewers', async (req, res, next) => {
  try {
    const { count } = req.body;
    const stream = await liveService.updateViewers(param(req, 'id'), count);
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

export default router;
