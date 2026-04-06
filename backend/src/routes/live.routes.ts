import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import liveService from '../services/live.service.js';
import { startLiveRecording, stopLiveRecording } from '../services/liveRecording.service.js';
import { LIVE_CATEGORIES, LIVE_LANGUAGES, LIVE_AGE_RESTRICTIONS } from '../config/liveCategories.js';
import { validateBody } from '../utils/zodValidation.js';
import { logger } from '../utils/logger.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  liveChapterSchema,
  liveChatSchema,
  liveCreatorSubscribeSchema,
  liveEndSchema,
  liveGiftSchema,
  liveModerationPatchSchema,
  liveReactionSchema,
  liveSessionBodySchema,
  liveStartSchema,
  liveTipSchema,
  liveWalletRechargeSchema,
} from '../schemas/highRiskBodies.js';

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

// GET /api/live/agora-status - Vérifier si Agora est configuré + test génération token (diagnostic, pas d'auth)
router.get('/agora-status', async (_req, res) => {
  const hasAppId = !!process.env.AGORA_APP_ID?.trim();
  const hasCert = !!process.env.AGORA_APP_CERTIFICATE?.trim();
  let tokenTestOk = false;
  let tokenError = '';
  if (hasAppId && hasCert) {
    try {
      const result = await liveService.getAgoraToken('test_channel', 'test-user', 'host');
      tokenTestOk = !!(result?.token && result?.appId && result?.channel);
      if (!tokenTestOk && result?.token) tokenError = 'appId ou channel manquant dans la réponse';
      else if (!tokenTestOk) tokenError = 'getAgoraToken a retourné null';
    } catch (e: any) {
      tokenError = e?.message || String(e) || 'Erreur génération token';
    }
  }
  const configured = hasAppId && hasCert && tokenTestOk;
  res.json({
    success: true,
    data: {
      configured,
      hasAppId,
      hasCert,
      tokenTestOk,
      tokenError: tokenError || undefined,
      message: configured
        ? 'Agora prêt'
        : tokenError
          ? `Erreur token: ${tokenError}`
          : !hasAppId
            ? 'AGORA_APP_ID manquant dans backend/.env'
            : !hasCert
              ? 'AGORA_APP_CERTIFICATE manquant dans backend/.env'
              : 'Configurer Agora',
    },
  });
});

// GET /api/live - CDC: sortBy = viewers | recent | popularity | duration
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
    if (req.query.sortBy) filters.sortBy = req.query.sortBy as string;
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

// GET /api/live/recommendations - Recommandations intelligentes basées sur l'activité utilisateur
router.get('/recommendations', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const excludeLiveId = req.query.excludeLiveId as string | undefined;
    const userId = req.user?.id ?? null;
    const result = await liveService.getRecommendations(userId, { limit, excludeLiveId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/categories - CDC: catégories, langues, restriction âge
router.get('/categories', (_req, res) => {
  res.json({ success: true, data: { categories: LIVE_CATEGORIES, languages: LIVE_LANGUAGES, ageRestrictions: LIVE_AGE_RESTRICTIONS } });
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
router.post('/wallet/recharge', authenticate, validateBody(liveWalletRechargeSchema), async (req: AuthRequest, res, next) => {
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

// GET /api/live/creator/export - CDC: Export analytics CSV/JSON
router.get('/creator/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const data = await liveService.exportCreatorAnalytics(req.user!.id, format as any);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=live-analytics.csv');
      return res.send(data);
    }
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/creator/:creatorId/subscribe - CDC: Abonnement don récurrent
router.post('/creator/:creatorId/subscribe', authenticate, validateBody(liveCreatorSubscribeSchema), async (req: AuthRequest, res, next) => {
  try {
    const amount = Number(req.body.amount) || 500;
    const sub = await liveService.subscribeToCreator(req.user!.id, param(req, 'creatorId'), amount);
    res.json({ success: true, data: sub });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/live/creator/:creatorId/subscribe
router.delete('/creator/:creatorId/subscribe', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await liveService.unsubscribeFromCreator(req.user!.id, param(req, 'creatorId'));
    res.json({ success: true });
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
router.post('/start', authenticate, validateBody(liveStartSchema), async (req: AuthRequest, res, next) => {
  try {
    const { title, description, category, streamUrl, thumbnail_url, stream_key, rtmp_url, playback_url, region, language, status, scheduled_at, tags, age_restriction, donations_enabled, private_mode, goal_target, delay_seconds, max_quality } = req.body;
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
      tags,
      age_restriction,
      donations_enabled,
      private_mode,
      goal_target,
      delay_seconds,
      max_quality,
    });
    if (stream.status === 'live') {
      startLiveRecording(stream.id).catch((err) =>
        logger.warn('Recording start failed (non-bloquant)', { err: err instanceof Error ? err.message : String(err) })
      );
    }
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/start-scheduled - Démarrer un live programmé
router.post('/:id/start-scheduled', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const stream = await liveService.startScheduledStream(param(req, 'id'), req.user!.id);
    if (stream?.status === 'live') {
      startLiveRecording(stream.id).catch((err) =>
        logger.warn('Recording start failed (non-bloquant)', { err: err instanceof Error ? err.message : String(err) })
      );
    }
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
router.post('/:id/join', authenticate, validateBody(liveSessionBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/:id/leave', authenticate, validateBody(liveSessionBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.user!.id + Date.now();
    await liveService.leaveViewer(param(req, 'id'), req.user!.id, String(sessionId));
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/heartbeat
router.post('/:id/heartbeat', authenticate, validateBody(liveSessionBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.user!.id + Date.now();
    await liveService.heartbeatViewer(param(req, 'id'), req.user!.id, String(sessionId));
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/end (body.replay_url optionnel pour D)
router.post('/:id/end', authenticate, validateBody(liveEndSchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const replayUrl = (await stopLiveRecording(streamId)) ?? req.body?.replay_url ?? null;
    const stream = await liveService.endStream(streamId, req.user!.id, replayUrl ? { replay_url: replayUrl } : undefined);
    res.json({ success: true, data: replayUrl ? { ...stream, replay_url: replayUrl } : stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/chat (anti-spam 1/2s via chatLimiter)
router.post('/:id/chat', authenticate, validateBody(liveChatSchema), chatLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { message } = req.body;
    const chatMessage = await liveService.sendChatMessage(param(req, 'id'), req.user!.id, message);
    res.json({ success: true, data: chatMessage });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/tip - CDC: don direct (sans gift)
router.post('/:id/tip', authenticate, validateBody(liveTipSchema), giftLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { amount, message, is_anonymous } = req.body;
    const result = await liveService.sendTip(param(req, 'id'), req.user!.id, {
      amount: Number(amount) || 0,
      message,
      is_anonymous: !!is_anonymous,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/gift (rate limit 5/10s)
router.post('/:id/gift', authenticate, validateBody(liveGiftSchema), giftLimiter, async (req: AuthRequest, res, next) => {
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
router.post('/:id/like', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await liveService.like(param(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/reaction - CDC: heart, fire, thumbs
router.post('/:id/reaction', authenticate, validateBody(liveReactionSchema), async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.body;
    const result = await liveService.reaction(param(req, 'id'), req.user!.id, type as any);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/chapters - Chapitres replay
router.get('/:id/chapters', async (req, res, next) => {
  try {
    const chapters = await liveService.getReplayChapters(param(req, 'id'));
    res.json({ success: true, data: chapters });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/chapters - Créateur ajoute chapitre
router.post('/:id/chapters', authenticate, validateBody(liveChapterSchema), async (req: AuthRequest, res, next) => {
  try {
    const { title, start_seconds, end_seconds } = req.body;
    const ch = await liveService.addReplayChapter(param(req, 'id'), req.user!.id, { title, start_seconds, end_seconds });
    res.json({ success: true, data: ch });
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
router.patch('/:id/moderation', authenticate, validateBody(liveModerationPatchSchema), async (req: AuthRequest, res, next) => {
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
router.post('/:id/moderators', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/:id/ban', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/:id/chat/:messageId/pin', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const pin = req.body.pin !== false;
    await liveService.pinChatMessage(param(req, 'id'), param(req, 'messageId'), req.user!.id, pin);
    res.json({ success: true, pinned: pin });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/live/:id/chat/:messageId - Mettre à jour un message (is_answered, is_question, etc.)
router.patch('/:id/chat/:messageId', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const messageId = param(req, 'messageId');
    const updates = req.body; // { is_answered, is_question, etc. }
    const message = await liveService.updateChatMessage(streamId, messageId, req.user!.id, updates);
    res.json({ success: true, data: message });
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
router.patch('/:id/replay', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { replay_url } = req.body;
    const stream = await liveService.updateReplayUrl(param(req, 'id'), req.user!.id, replay_url);
    res.json({ success: true, data: stream });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/cleanup-viewers (cron avec X-Cron-Secret ou créateur authentifié)
const cronOrCreatorSecret = process.env.CRON_SECRET || process.env.LIVE_CLEANUP_SECRET;
router.post('/:id/cleanup-viewers', optionalAuth, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const authHeader = req.headers['x-cron-secret'] || req.headers['x-live-cleanup-secret'];
    const isCron = !!cronOrCreatorSecret && authHeader === cronOrCreatorSecret;
    if (!isCron) {
      if (!req.user?.id) return res.status(401).json({ success: false, error: { message: 'Authentification requise' } });
      const stream = await liveService.getStream(streamId);
      if (!stream || stream.creator_id !== req.user.id) return res.status(403).json({ success: false, error: { message: 'Non autorisé' } });
    }
    const count = await liveService.cleanupInactiveViewers(streamId);
    res.json({ success: true, data: { removed: count } });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/live/:id/viewers (legacy, créateur uniquement)
router.put('/:id/viewers', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const stream = await liveService.getStream(streamId);
    if (!stream || stream.creator_id !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'Non autorisé' } });
    }
    const { count } = req.body;
    const updated = await liveService.updateViewers(streamId, count);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/polls - Créer un sondage
router.post('/:id/polls', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const { question, options } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, error: { message: 'Question et au moins 2 options requises' } });
    }
    const poll = await liveService.createPoll(streamId, req.user!.id, { question, options });
    res.json({ success: true, data: poll });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/polls/:pollId/vote - Voter pour un sondage
router.post('/:id/polls/:pollId/vote', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const pollId = param(req, 'pollId');
    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return res.status(400).json({ success: false, error: { message: 'optionIndex invalide' } });
    }
    const result = await liveService.votePoll(streamId, pollId, req.user!.id, optionIndex);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/polls - Récupérer les sondages actifs
router.get('/:id/polls', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const userId = req.user?.id ?? null;
    const polls = await liveService.getPolls(streamId, userId);
    res.json({ success: true, data: polls });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/polls/:pollId/my-vote - Récupérer le vote de l'utilisateur pour un poll
router.get('/:id/polls/:pollId/my-vote', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const pollId = param(req, 'pollId');
    const userId = req.user!.id;
    const vote = await liveService.getUserPollVote(streamId, pollId, userId);
    res.json({ success: true, data: vote });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/polls/:pollId/end - Terminer un sondage
router.post('/:id/polls/:pollId/end', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const pollId = param(req, 'pollId');
    const poll = await liveService.endPoll(streamId, pollId, req.user!.id);
    res.json({ success: true, data: poll });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/cohost/invite - Inviter un co-host
router.post('/:id/cohost/invite', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId requis' } });
    }
    const invite = await liveService.inviteCoHost(streamId, req.user!.id, userId);
    res.json({ success: true, data: invite });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/cohost/accept - Accepter une invitation co-host
router.post('/:id/cohost/accept', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const result = await liveService.acceptCoHostInvite(streamId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/cohost/remove - Retirer un co-host
router.post('/:id/cohost/remove', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const streamId = param(req, 'id');
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId requis' } });
    }
    await liveService.removeCoHost(streamId, req.user!.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/live/:id/products - Produits en vente pendant le live (live commerce)
router.get('/:id/products', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const liveId = param(req, 'id');
    const links = await prisma.liveStreamProduct.findMany({
      where: { live_id: liveId },
      orderBy: { position: 'asc' },
      include: { product: true },
    });
    res.json({ success: true, data: links.map((l) => ({ ...l.product, position: l.position })) });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/live/:id/products - Ajouter un produit au live (créateur)
router.post('/:id/products', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const liveId = param(req, 'id');
    const { product_id, position } = req.body;
    if (!product_id) return res.status(400).json({ success: false, error: { message: 'product_id requis' } });
    const stream = await prisma.liveStream.findFirst({ where: { id: liveId, creator_id: req.user!.id } });
    if (!stream) return res.status(404).json({ success: false, error: 'Live introuvable' });
    const product = await prisma.product.findFirst({ where: { id: product_id, seller_id: req.user!.id } });
    if (!product) return res.status(404).json({ success: false, error: 'Produit introuvable' });
    const existing = await prisma.liveStreamProduct.findFirst({
      where: { live_id: liveId, product_id: product_id },
    });
    const link = existing
      ? await prisma.liveStreamProduct.update({
          where: { id: existing.id },
          data: { position: position ?? 0 },
        })
      : await prisma.liveStreamProduct.create({
          data: { live_id: liveId, product_id: product_id, position: position ?? 0 },
        });
    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/live/:id/products/:productId - Retirer un produit du live
router.delete('/:id/products/:productId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const liveId = param(req, 'id');
    const productId = param(req, 'productId');
    const stream = await prisma.liveStream.findFirst({ where: { id: liveId, creator_id: req.user!.id } });
    if (!stream) return res.status(404).json({ success: false, error: 'Live introuvable' });
    await prisma.liveStreamProduct.deleteMany({ where: { live_id: liveId, product_id: productId } });
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;
