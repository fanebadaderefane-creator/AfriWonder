/**
 * Service Live Streaming — 100% production ready
 * Viewers réels, Wallet sécurisé, Modération, Analytics, Anti-spam
 * A: Agora token optionnel. B: Recharge wallet. C: Notif push live started. D: Replay URL.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import platformRevenueService from './platformRevenue.service.js';
import notificationService from './notification.service.js';
import paymentService from './payment.service.js';
import { normalizeOrangeMoneySubscriberMl } from '../utils/orangeMoneyPhone.js';
import crypto from 'crypto';
import commissionService from './commission.service.js';
import coinsService from './coins.service.js';
import { COIN_FCFA_APPROX_PURCHASE_PER_COIN, COIN_FCFA_PER_COIN_PAYOUT } from '../config/coinEconomy.js';
import { COMMISSION_VERTICALS } from '../config/commissions.js';
import { generateThumbnailForLiveStreamId, pickLiveReplaySrc } from './videoThumbnail.service.js';
import { maskProfanityFr } from '../utils/liveProfanityMask.js';
import { transcribeLiveAudioWhisper } from './liveStt.service.js';
import {
  canViewerAccessLive,
  joinAccessErrorCode,
  resolveViewerJoinAccess,
  type ViewerJoinAccess,
} from '../utils/liveJoinAccess.js';
import { getCreatorSubscribeStatusPure } from '../utils/liveCreatorSubscribeStatus.js';

// Cadeaux live : 50% partagé (25% créateur, 25% plateforme) — modèle AfriWonder
const VIEWER_INACTIVE_SEC = 60;
const GIFT_RATE_LIMIT_COUNT = 5;
const GIFT_RATE_LIMIT_WINDOW_MS = 10 * 1000;
const GIFT_COMBO_WINDOW_MS = 5000;

/** Combo : même cadeau répété dans une fenêtre courte (mémoire process ; en prod → Redis). */
const giftComboStreak = new Map<string, { giftId: string; lastAt: number; streak: number }>();

function computeGiftCombo(streamId: string, senderId: string, giftId: string): number {
  const key = `${streamId}:${senderId}`;
  const now = Date.now();
  const prev = giftComboStreak.get(key);
  if (!prev || prev.giftId !== giftId || now - prev.lastAt > GIFT_COMBO_WINDOW_MS) {
    giftComboStreak.set(key, { giftId, lastAt: now, streak: 1 });
    return 1;
  }
  const next = { giftId, lastAt: now, streak: prev.streak + 1 };
  giftComboStreak.set(key, next);
  return next.streak;
}

/** Durée replay hors premium : `LIVE_REPLAY_RETENTION_HOURS` (défaut **72 h**), sinon jours via `LIVE_REPLAY_RETENTION_DAYS_DEFAULT`. */
function parseReplayNonPremiumRetentionDays(): number {
  const hoursRaw = parseInt(process.env.LIVE_REPLAY_RETENTION_HOURS || '72', 10);
  if (Number.isFinite(hoursRaw) && hoursRaw > 0) {
    return Math.min(365, Math.max(1, Math.ceil(hoursRaw / 24)));
  }
  const days = parseInt(process.env.LIVE_REPLAY_RETENTION_DAYS_DEFAULT || '3', 10);
  if (!Number.isFinite(days) || days < 1) return 3;
  return Math.min(365, days);
}

function parseReplayPremiumRetentionDays(): number {
  const raw = parseInt(process.env.LIVE_REPLAY_PREMIUM_RETENTION_DAYS || '3650', 10);
  if (!Number.isFinite(raw) || raw < 1) return 3650;
  return Math.min(36500, raw);
}

/** 0 = désactivé (seule la règle « très vieux » reste). Sinon : flux `live` sans spectateur et sans mise à jour du row depuis N h. */
function parseLiveStaleIdleEndHours(): number | null {
  const raw = parseInt(process.env.LIVE_STALE_AUTO_END_HOURS || '12', 10);
  if (!Number.isFinite(raw) || raw < 0) return 12;
  if (raw === 0) return null;
  return raw;
}

/** Lives oubliés encore en `live` après trop longtemps (nettoyage). */
function parseLiveMaxAgeDays(): number {
  const raw = parseInt(process.env.LIVE_MAX_LIVE_AGE_DAYS || '14', 10);
  if (!Number.isFinite(raw) || raw < 1) return 14;
  return Math.min(90, raw);
}

// In-memory rate limits (en prod: Redis)
const giftRateLimitMap = new Map<string, number[]>();
const raiseHandCooldown = new Map<string, number>();
const RAISE_HAND_MIN_MS = 2000;
const joinRequestCooldown = new Map<string, number>();
const JOIN_REQUEST_MIN_MS = 3000;
/** CDC spectateur : 1 clic = 1 animation — anti-spam réactions côté serveur. */
const liveReactionCooldown = new Map<string, number>();
const LIVE_REACTION_MIN_MS = 900;

/** Timer commun (CDC C) — mémoire process ; en multi-nœuds → Redis + emit via adapter. */
const liveBroadcastTimers = new Map<string, { end_at_ms: number; label: string }>();

function getIO(): any {
  try {
    const { io } = require('../index.js');
    return io;
  } catch {
    return null;
  }
}

function pruneGiftRateLimit(key: string) {
  const now = Date.now();
  const arr = giftRateLimitMap.get(key) || [];
  const kept = arr.filter((t) => now - t < GIFT_RATE_LIMIT_WINDOW_MS);
  if (kept.length) giftRateLimitMap.set(key, kept);
  else giftRateLimitMap.delete(key);
  return kept;
}

async function getOrCreateWallet(userId: string) {
  const ledgerService = (await import('./ledger.service.js')).default;
  return await ledgerService.getOrCreateUserWallet(userId, 'XOF');
}

async function syncViewersCount(streamId: string) {
  const cutoff = new Date(Date.now() - VIEWER_INACTIVE_SEC * 1000);
  await prisma.liveViewer.updateMany({
    where: { live_id: streamId, is_active: true, last_seen_at: { lt: cutoff } },
    data: { is_active: false, left_at: new Date() },
  });
  const activeCount = await prisma.liveViewer.count({
    where: { live_id: streamId, is_active: true, last_seen_at: { gte: cutoff } },
  });
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    select: { peak_viewers: true },
  });
  const peak = Math.max(activeCount, stream?.peak_viewers ?? 0);
  await prisma.liveStream.update({
    where: { id: streamId },
    data: { viewers_count: activeCount, peak_viewers: peak },
  });
  const io = getIO();
  if (io) io.to(`stream:${streamId}`).emit('live:viewers', { count: activeCount });
  return activeCount;
}

/** UID numérique pour Agora (1 .. 2^32-1) à partir de userId */
function userIdToAgoraUid(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest();
  const uid = hash.readUInt32BE(0) >>> 0;
  return uid > 0 ? uid : 1; // Agora exige uid >= 1
}

class LiveService {
  /** Génération token stream : Agora RTC si configuré, sinon HMAC */
  generateStreamToken(roomId: string, userId: string, role: 'host' | 'audience'): string {
    const secret = process.env.STREAM_SECRET || process.env.AGORA_APP_SECRET || 'dev-secret';
    const payload = `${roomId}:${userId}:${role}:${Date.now()}`;
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return token.slice(0, 128);
  }

  /** Token Agora RTC (si AGORA_APP_ID + AGORA_APP_CERTIFICATE) */
  async getAgoraToken(channelName: string, userId: string, role: 'host' | 'audience'): Promise<{ token: string; appId: string; channel: string; uid: number; expireTime: number } | null> {
    const appId = process.env.AGORA_APP_ID?.trim();
    const appCert = process.env.AGORA_APP_CERTIFICATE?.trim();
    if (!appId || !appCert) return null;
    try {
      const agoraToken = await import('agora-token');
      const { RtcTokenBuilder, RtcRole } = agoraToken.default ?? agoraToken;
      if (!RtcTokenBuilder || !RtcRole) {
        throw new Error('agora-token: RtcTokenBuilder ou RtcRole manquant. Vérifiez la version du package.');
      }
      const uid = userIdToAgoraUid(userId);
      const rawTtl = parseInt(process.env.AGORA_TOKEN_EXPIRE_SECONDS || '86400', 10);
      const expireSec = Number.isFinite(rawTtl) ? Math.min(604800, Math.max(600, rawTtl)) : 86400;
      const rtcRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      const expireTime = Math.floor(Date.now() / 1000) + expireSec;
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, uid, rtcRole, expireSec, expireSec);
      return { token, appId, channel: channelName, uid, expireTime };
    } catch (e) {
      const msg = (e as Error).message;
      logger.warn('Agora token generation failed', { err: msg });
      throw new Error(`Agora: ${msg}`);
    }
  }

  async createStream(userId: string, data: {
    title: string;
    description?: string;
    category?: string;
    streamUrl?: string;
    thumbnail_url?: string;
    stream_key?: string;
    rtmp_url?: string;
    playback_url?: string;
    region?: string;
    language?: string;
    status?: 'scheduled' | 'live';
    scheduled_at?: Date;
    tags?: string[];
    age_restriction?: string;
    donations_enabled?: boolean;
    private_mode?: boolean;
    goal_target?: number;
    delay_seconds?: number;
    max_quality?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile_image: true },
    });
    if (!user) throw new Error('User not found');

    const roomId = `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const streamToken = this.generateStreamToken(roomId, userId, 'host');
    const status = data.status || 'live';

    const stream = await prisma.liveStream.create({
      data: {
        creator_id: userId,
        creator_name: user.username || 'Unknown',
        // Aligné schéma API : titre max 80
        title: data.title.slice(0, 80),
        description: data.description ? data.description.slice(0, 500) : null,
        category: data.category,
        stream_url: data.streamUrl || '',
        stream_token: streamToken,
        stream_key: data.stream_key,
        rtmp_url: data.rtmp_url,
        playback_url: data.playback_url,
        thumbnail_url: data.thumbnail_url,
        region: data.region,
        language: data.language || 'fr',
        status,
        scheduled_at: data.scheduled_at,
        room_id: roomId,
        tags: (data.tags || []).slice(0, 5),
        age_restriction: data.age_restriction || 'all',
        donations_enabled: data.donations_enabled ?? true,
        private_mode: data.private_mode ?? false,
        goal_target: data.goal_target ?? null,
        goal_amount: data.goal_target ? 0 : null,
        delay_seconds: Math.min(60, Math.max(0, data.delay_seconds ?? 0)),
        max_quality: data.max_quality || 'auto',
        replay_retention_days: parseReplayNonPremiumRetentionDays(),
      },
    });

    await prisma.liveModerationSettings.create({
      data: {
        live_id: stream.id,
        slow_mode_seconds: 0,
        comments_enabled: true,
        followers_only: false,
      },
    });

    const io = getIO();
    if (io && status === 'live') io.emit('live:started', { streamId: stream.id, creatorId: userId, title: data.title, roomId });

    // C: Notifications followers — live immédiat ou live planifié (CDC 6.1)
    try {
      const followers = await prisma.follow.findMany({
        where: { following_id: userId },
        select: { follower_id: true },
      });
      const creatorName = user.username || 'Un créateur';
      const schedLabel =
        data.scheduled_at instanceof Date
          ? data.scheduled_at.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
          : data.scheduled_at
            ? String(data.scheduled_at)
            : '';
      for (const f of followers) {
        try {
          if (status === 'scheduled') {
            await notificationService.create(f.follower_id, {
              type: 'live_scheduled',
              title: 'Live annoncé',
              message: schedLabel
                ? `${creatorName} a planifié un live : ${data.title} — ${schedLabel}`
                : `${creatorName} a planifié un live : ${data.title}`,
              reference_type: 'live',
              reference_id: stream.id,
            });
          } else {
            await notificationService.create(f.follower_id, {
              type: 'live_started',
              title: 'Live démarré',
              message: `${creatorName} a commencé un live : ${data.title}`,
              reference_type: 'live',
              reference_id: stream.id,
            });
          }
        } catch (_) {}
      }
      if (status === 'live' && followers.length) logger.info('Live started notifications sent', { streamId: stream.id, count: followers.length });
      if (status === 'scheduled' && followers.length)
        logger.info('Live scheduled notifications sent', { streamId: stream.id, count: followers.length });

      if (status === 'live') {
        const followerSet = new Set(followers.map((f) => f.follower_id));
        await this.notifyBellSubscribersOnLiveStart(userId, stream.id, data.title, creatorName, followerSet);
      }
    } catch (e) {
      logger.warn('Live follower notifications skip', { streamId: stream.id });
    }

    logger.info('Live stream created', { userId, streamId: stream.id, status });
    return { ...stream, stream_token: streamToken };
  }

  /** Démarrer un live programmé (scheduled → live) */
  async startScheduledStream(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Stream not found or unauthorized');
    if (stream.status !== 'scheduled') throw new Error('Stream is not scheduled');
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { status: 'live', started_at: new Date() },
    });
    const io = getIO();
    if (io) io.emit('live:started', { streamId, creatorId: userId, title: stream.title, roomId: stream.room_id });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      const followers = await prisma.follow.findMany({
        where: { following_id: userId },
        select: { follower_id: true },
      });
      const creatorName = user?.username || 'Un créateur';
      for (const f of followers) {
        try {
          await notificationService.create(f.follower_id, {
            type: 'live_started',
            title: 'Live démarré',
            message: `${creatorName} a commencé un live : ${stream.title}`,
            reference_type: 'live',
            reference_id: streamId,
          });
        } catch (_) {}
      }
      const followerSet = new Set(followers.map((x) => x.follower_id));
      await this.notifyBellSubscribersOnLiveStart(userId, streamId, stream.title, creatorName, followerSet);
    } catch (e) {
      logger.warn('Live scheduled→live notifications skip', { streamId });
    }

    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  /** Retourne { token, appId?, channel?, uid? } pour Agora ou token HMAC seul */
  async getStreamToken(streamId: string, userId: string, role: 'host' | 'audience') {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (role === 'host' && stream.creator_id !== userId) {
      const cohost = await prisma.liveCoHost.findUnique({
        where: { live_id_cohost_id: { live_id: streamId, cohost_id: userId } },
      });
      if (!cohost || cohost.status !== 'accepted') throw new Error('Unauthorized');
    }
    if (role === 'audience') {
      await this.assertViewerJoinAccess(streamId, userId);
    }
    try {
      const agora = await this.getAgoraToken(stream.room_id, userId, role);
      if (agora) return { ...agora, streamId };
    } catch (_e) {
      logger.warn('Agora token fallback to HMAC', { streamId });
    }
    return {
      token: this.generateStreamToken(stream.room_id, userId, role),
      appId: null,
      channel: null,
      uid: null,
      expireTime: null,
      streamId,
    };
  }

  /**
   * Rôle RTC pour l’écran spectateur (`/live/[id]`) : co-host accepté = broadcaster.
   * Le créateur diffuse via `stream.tsx` ; s’il ouvre le lecteur, il reste spectateur (pas double publish).
   */
  async getRtcRoleForViewer(streamId: string, userId: string): Promise<{ role: 'host' | 'audience' }> {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.creator_id === userId) return { role: 'audience' };
    const co = await prisma.liveCoHost.findUnique({
      where: { live_id_cohost_id: { live_id: streamId, cohost_id: userId } },
    });
    if (co?.status === 'accepted') return { role: 'host' };
    const guest = await prisma.liveGuestSlot.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
    });
    if (guest?.status === 'active') return { role: 'host' };
    return { role: 'audience' };
  }

  private async getViewerJoinAccess(streamId: string, userId: string): Promise<ViewerJoinAccess> {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { creator_id: true, private_mode: true },
    });
    if (!stream) throw new Error('Stream not found');
    if (stream.creator_id === userId) return 'allowed';
    if (!stream.private_mode) return 'allowed';
    const row = await prisma.liveJoinRequest.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
      select: { status: true },
    });
    return resolveViewerJoinAccess({
      isCreator: false,
      privateMode: true,
      requestStatus: row?.status,
    });
  }

  private throwJoinAccessDenied(access: ViewerJoinAccess): never {
    const err: any = new Error(
      access === 'pending'
        ? 'Votre demande d’accès est en attente d’approbation du créateur.'
        : access === 'rejected'
          ? 'Le créateur a refusé votre accès à ce live.'
          : 'Ce live est privé. Envoyez une demande d’accès au créateur.',
    );
    err.statusCode = 403;
    err.isOperational = true;
    err.code = joinAccessErrorCode(access);
    throw err;
  }

  private async assertViewerJoinAccess(streamId: string, userId: string): Promise<void> {
    const access = await this.getViewerJoinAccess(streamId, userId);
    if (!canViewerAccessLive(access)) this.throwJoinAccessDenied(access);
  }

  /** Spectateur — demande d'accès (live `private_mode`). */
  async requestJoinAccess(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    if (stream.creator_id === userId) throw new Error('Le créateur a déjà accès au live.');
    if (!stream.private_mode) {
      return { ok: true, status: 'allowed' as const, already_public: true as const };
    }

    const key = `${streamId}:${userId}`;
    const now = Date.now();
    const last = joinRequestCooldown.get(key) ?? 0;
    if (now - last < JOIN_REQUEST_MIN_MS) {
      throw new Error('Attendez quelques secondes avant de renvoyer une demande.');
    }
    joinRequestCooldown.set(key, now);

    const existing = await prisma.liveJoinRequest.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
    });
    if (existing?.status === 'accepted') {
      return { ok: true, status: 'accepted' as const };
    }
    if (existing?.status === 'pending') {
      return { ok: true, status: 'pending' as const, already_pending: true as const };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, full_name: true, profile_image: true },
    });
    const username = (user?.full_name || user?.username || 'Spectateur').trim().slice(0, 80) || 'Spectateur';

    await prisma.liveJoinRequest.upsert({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
      create: { live_id: streamId, user_id: userId, status: 'pending', requested_at: new Date() },
      update: { status: 'pending', requested_at: new Date(), responded_at: null },
    });

    const io = getIO();
    const payload = {
      userId,
      username,
      avatar: user?.profile_image || null,
      at: now,
      streamId,
    };
    if (io) {
      io.to(`user:${stream.creator_id}`).emit('live:join-request', payload);
      io.to(`stream:${streamId}`).emit('live:join-request', payload);
    }
    logger.info('Live join-request', { streamId, userId });
    return { ok: true, status: 'pending' as const };
  }

  /** Créateur — liste des demandes d'accès en attente. */
  async listPendingJoinRequests(streamId: string, creatorId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    const rows = await prisma.liveJoinRequest.findMany({
      where: { live_id: streamId, status: 'pending' },
      orderBy: { requested_at: 'asc' },
      take: 50,
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    return rows.map((r) => ({
      userId: r.user_id,
      username: (r.user.full_name || r.user.username || 'Spectateur').trim().slice(0, 80),
      avatar: r.user.profile_image,
      requested_at: r.requested_at,
    }));
  }

  /** Créateur — accepte ou refuse une demande d'accès. */
  async respondJoinRequest(streamId: string, creatorId: string, targetUserId: string, accept: boolean) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    if (targetUserId === creatorId) throw new Error('Invalid target');

    const row = await prisma.liveJoinRequest.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: targetUserId } },
    });
    if (!row) throw new Error('Demande introuvable.');

    const nextStatus = accept ? 'accepted' : 'rejected';
    await prisma.liveJoinRequest.update({
      where: { live_id_user_id: { live_id: streamId, user_id: targetUserId } },
      data: { status: nextStatus, responded_at: new Date() },
    });

    const io = getIO();
    const resolved = { streamId, accepted: accept, userId: targetUserId };
    if (io) {
      io.to(`user:${targetUserId}`).emit('live:join-request:resolved', resolved);
      io.to(`stream:${streamId}`).emit('live:join-request:resolved', resolved);
    }
    logger.info('Live join-request respond', { streamId, targetUserId, accept });
    return { ok: true, accept, userId: targetUserId };
  }

  /** Statut d'accès du spectateur connecté (live privé). */
  async getJoinAccessStatus(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { private_mode: true, creator_id: true, status: true },
    });
    if (!stream) throw new Error('Stream not found');
    const access = await this.getViewerJoinAccess(streamId, userId);
    return {
      private_mode: stream.private_mode,
      status: access,
      can_join: canViewerAccessLive(access),
    };
  }

  /** Spectateur / co-host : main levée (socket `live:raise-hand`). Pas pour le créateur du live. */
  async setRaiseHand(streamId: string, userId: string, raised: boolean) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    if (stream.creator_id === userId) return { ok: true, raised, ignored: true as const };

    const key = `${streamId}:${userId}`;
    const now = Date.now();
    if (raised) {
      const last = raiseHandCooldown.get(key) ?? 0;
      if (now - last < RAISE_HAND_MIN_MS) throw new Error('Attendez un instant avant de lever la main à nouveau.');
      raiseHandCooldown.set(key, now);
    } else {
      raiseHandCooldown.delete(key);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, full_name: true },
    });
    const username = (user?.full_name || user?.username || 'Spectateur').trim().slice(0, 80) || 'Spectateur';

    const io = getIO();
    if (io) {
      io.to(`stream:${streamId}`).emit('live:raise-hand', {
        userId,
        raised,
        username,
        at: now,
      });
    }
    logger.info('Live raise-hand', { streamId, userId, raised });
    return { ok: true, raised };
  }

  /** CDC 6.3 — Créateur accepte ou refuse une demande de parole (main levée). Si accepté → invitation co-host (grille). */
  async respondRaiseHand(streamId: string, creatorId: string, targetUserId: string, accept: boolean) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    if (targetUserId === creatorId) throw new Error('Invalid target');

    const io = getIO();
    if (accept) {
      await this.inviteCoHost(streamId, creatorId, targetUserId);
      if (io) {
        io.to(`user:${targetUserId}`).emit('live:raise-hand:resolved', { streamId, accepted: true });
        io.to(`stream:${streamId}`).emit('live:raise-hand:resolved', { userId: targetUserId, accepted: true });
      }
    } else {
      if (io) {
        io.to(`stream:${streamId}`).emit('live:raise-hand:rejected', { userId: targetUserId });
        io.to(`user:${targetUserId}`).emit('live:raise-hand:resolved', { streamId, accepted: false });
      }
    }
    return { ok: true, accept };
  }

  /** Accusé réception âge (traçabilité CDC) avant join sur live 13+ / 18+. */
  async acknowledgeLiveAge(streamId: string, userId: string, restriction: '18+' | '13+') {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    const ar = String(stream.age_restriction || 'all');
    if (ar === '18+') {
      if (restriction !== '18+') throw new Error('Ce live exige une confirmation 18+.');
    } else if (ar === '13+') {
      if (restriction !== '13+' && restriction !== '18+') throw new Error('Restriction âge invalide.');
    } else {
      return { ok: true, skipped: true as const };
    }
    await prisma.liveAgeAcknowledgment.upsert({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
      create: { live_id: streamId, user_id: userId, restriction },
      update: { restriction, confirmed_at: new Date() },
    });
    return { ok: true };
  }

  async setLiveBellSubscribe(subscriberId: string, creatorId: string, enabled: boolean) {
    if (subscriberId === creatorId) throw new Error('Impossible de vous abonner à votre propre cloche.');
    const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!creator) throw new Error('Créateur introuvable');
    if (enabled) {
      await prisma.liveCreatorBellSubscriber.upsert({
        where: { subscriber_id_creator_id: { subscriber_id: subscriberId, creator_id: creatorId } },
        create: { subscriber_id: subscriberId, creator_id: creatorId },
        update: {},
      });
    } else {
      await prisma.liveCreatorBellSubscriber.deleteMany({
        where: { subscriber_id: subscriberId, creator_id: creatorId },
      });
    }
    return { subscribed: enabled };
  }

  async getLiveBellSubscribed(subscriberId: string, creatorId: string) {
    const row = await prisma.liveCreatorBellSubscriber.findUnique({
      where: { subscriber_id_creator_id: { subscriber_id: subscriberId, creator_id: creatorId } },
    });
    return { subscribed: !!row };
  }

  /** Notif « cloche » aux abonnés hors followers (followers déjà notifiés dans createStream). */
  async notifyBellSubscribersOnLiveStart(creatorId: string, streamId: string, title: string, creatorName: string, followerIds: Set<string>) {
    const rows = await prisma.liveCreatorBellSubscriber.findMany({
      where: { creator_id: creatorId },
      select: { subscriber_id: true },
    });
    for (const r of rows) {
      if (followerIds.has(r.subscriber_id)) continue;
      try {
        await notificationService.create(r.subscriber_id, {
          type: 'live_creator_bell',
          title: 'Live — créateur suivi',
          message: `${creatorName} est en direct : ${title}`,
          reference_type: 'live',
          reference_id: streamId,
        });
      } catch (_) {}
    }
  }

  /** CDC 6.4 — Méta monnaie virtuelle (taux indicatif, configurable). */
  getLiveEconomyMeta() {
    const raw = parseInt(process.env.LIVE_COINS_PER_USD || '200', 10);
    const coinsPerUsd = Number.isFinite(raw) && raw > 0 ? raw : 200;
    const usdPerCoin = 1 / coinsPerUsd;
    const livePct = COMMISSION_VERTICALS.video_social.live_gift_creator_pct;
    return {
      currency: 'USD',
      coins_per_usd: coinsPerUsd,
      usd_per_coin: Math.round(usdPerCoin * 1e6) / 1e6,
      /** Ex. 100 coins → 0,5 USD quand LIVE_COINS_PER_USD=200 */
      example_coins: 100,
      example_usd: Math.round((100 / coinsPerUsd) * 10000) / 10000,
      /** Indicatif achat packs (FCFA / coin). */
      fcfa_approx_per_coin_purchase: COIN_FCFA_APPROX_PURCHASE_PER_COIN,
      /** Reversement portefeuille créateur par coin (Phase 9). */
      fcfa_per_coin_creator_payout: COIN_FCFA_PER_COIN_PAYOUT,
      /** Part créateur sur la valeur FCFA d’un cadeau live (affichage UI). */
      live_gift_creator_share: livePct,
    };
  }

  /** CDC 6.2 — Sous-titres manuels hôte (diffusion temps réel ; STT optionnel côté client si clé). */
  async broadcastLiveCaption(streamId: string, creatorId: string, text: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    const t = String(text || '').trim().slice(0, 280);
    if (!t) throw new Error('Texte vide');
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:caption', { text: t, at: Date.now() });
    return { ok: true };
  }

  /** CDC 6.2 — Dictée hôte → STT (Whisper) ; le texte est renvoyé pour édition / diffusion manuelle. */
  async transcribeLiveHostDictation(streamId: string, creatorId: string, audio: Buffer, mimeType: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream has ended');
    const text = await transcribeLiveAudioWhisper(audio, mimeType);
    return { text: text.slice(0, 2000) };
  }

  /** Viewer rejoint → create LiveViewer, sync count. Optionnel: country pour analytics. */
  async joinViewer(streamId: string, userId: string, sessionId: string, options?: { country?: string; city?: string }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended');

    const ar = String(stream.age_restriction || 'all');
    if (ar === '18+' || ar === '13+') {
      const ack = await prisma.liveAgeAcknowledgment.findUnique({
        where: { live_id_user_id: { live_id: streamId, user_id: userId } },
      });
      const okAck =
        !!ack &&
        (ar === '13+' ? ack.restriction === '13+' || ack.restriction === '18+' : ack.restriction === '18+');
      if (!okAck) {
        const err: any = new Error('Confirmation âge requise (POST /api/live/:id/age-ack).');
        err.statusCode = 403;
        err.isOperational = true;
        err.code = 'AGE_ACK_REQUIRED';
        throw err;
      }
    }

    await this.assertViewerJoinAccess(streamId, userId);

    await prisma.liveViewer.upsert({
      where: {
        live_id_user_id_session_id: { live_id: streamId, user_id: userId, session_id: sessionId },
      },
      create: {
        live_id: streamId,
        user_id: userId,
        session_id: sessionId,
        is_active: true,
        last_seen_at: new Date(),
        country: options?.country?.slice(0, 10),
        city: options?.city?.trim().slice(0, 80) || null,
      },
      update: {
        is_active: true,
        left_at: null,
        last_seen_at: new Date(),
        country: options?.country?.slice(0, 10),
        city: options?.city?.trim().slice(0, 80) || null,
      },
    });

    const count = await syncViewersCount(streamId);
    return { viewers_count: count };
  }

  /** Viewer quitte → left_at, is_active false, watch_duration calculé */
  async leaveViewer(streamId: string, userId: string, sessionId: string) {
    const viewers = await prisma.liveViewer.findMany({
      where: { live_id: streamId, user_id: userId, session_id: sessionId, is_active: true },
    });
    const now = new Date();
    for (const v of viewers) {
      const watchDurationSec = Math.floor((now.getTime() - v.joined_at.getTime()) / 1000);
      await prisma.liveViewer.update({
        where: { id: v.id },
        data: { left_at: now, is_active: false, watch_duration: watchDurationSec },
      });
    }
    return syncViewersCount(streamId);
  }

  /** Heartbeat (toutes les ~30s) → last_seen_at */
  async heartbeatViewer(streamId: string, userId: string, sessionId: string) {
    await prisma.liveViewer.updateMany({
      where: { live_id: streamId, user_id: userId, session_id: sessionId },
      data: { last_seen_at: new Date() },
    });
    return { ok: true };
  }

  /** Marquer inactifs après VIEWER_INACTIVE_SEC */
  async cleanupInactiveViewers(streamId: string) {
    const cutoff = new Date(Date.now() - VIEWER_INACTIVE_SEC * 1000);
    const r = await prisma.liveViewer.updateMany({
      where: { live_id: streamId, is_active: true, last_seen_at: { lt: cutoff } },
      data: { is_active: false, left_at: new Date() },
    });
    if (r.count > 0) await syncViewersCount(streamId);
    return r.count;
  }

  async getStream(streamId: string, readerUserId?: string | null) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        creator: { select: { id: true, username: true, profile_image: true, is_verified: true, replay_premium: true } },
        moderation_settings: true,
        chat_messages: {
          take: 100,
          orderBy: [{ is_pinned: 'desc' }, { created_date: 'desc' }],
          where: { is_deleted: false, message_type: { not: 'replay_comment' } },
        },
        gifts: { take: 30, orderBy: { created_at: 'desc' } },
        replay_chapters: { orderBy: { start_seconds: 'asc' } },
      },
    });
    if (!stream) return null;
    const moderatorIds = new Set((await prisma.liveModerator.findMany({ where: { live_id: streamId }, select: { user_id: true } })).map((m) => m.user_id));
    const topDonorIds = new Set((await prisma.liveTopDonor.findMany({ where: { live_id: streamId }, take: 20, select: { user_id: true } })).map((d) => d.user_id));
    const creatorId = stream.creator_id;
    const creator = stream.creator as { replay_premium?: boolean };
    const retentionDays = creator?.replay_premium ? parseReplayPremiumRetentionDays() : parseReplayNonPremiumRetentionDays();
    const now = new Date();
    const mapChatBadge = (msg: any) => {
      const pinExpired = msg.pin_expires_at && new Date(msg.pin_expires_at) < now;
      return {
        ...msg,
        is_pinned: msg.is_pinned && !pinExpired,
        sender_badges: {
          is_creator: msg.sender_id === creatorId,
          is_moderator: moderatorIds.has(msg.sender_id),
          is_top_supporter: topDonorIds.has(msg.sender_id),
        },
      };
    };
    const chatWithBadges = stream.chat_messages.map(mapChatBadge);

    let replay_chat_messages: any[] = [];
    if (stream.status === 'ended') {
      const replayRows = await prisma.liveChat.findMany({
        where: { live_id: streamId, is_deleted: false, message_type: 'replay_comment' },
        take: 200,
        orderBy: { created_date: 'asc' },
      });
      replay_chat_messages = replayRows.map(mapChatBadge);
    }

    if (stream.status === 'ended' && !String(stream.thumbnail_url || '').trim()) {
      const src = pickLiveReplaySrc({
        replay_url: stream.replay_url,
        playback_url: stream.playback_url,
        stream_url: stream.stream_url,
      });
      if (src) {
        void generateThumbnailForLiveStreamId(streamId, { internal: true, force: false }).catch(() => {});
      }
    }

    let viewer_age_acknowledged: boolean | undefined;
    let needs_age_ack_for_viewer = false;
    let viewer_live_bell_subscribed: boolean | undefined;
    if (readerUserId) {
      const ar = String(stream.age_restriction || 'all');
      if ((ar === '18+' || ar === '13+') && stream.status === 'live') {
        const ack = await prisma.liveAgeAcknowledgment.findUnique({
          where: { live_id_user_id: { live_id: streamId, user_id: readerUserId } },
        });
        viewer_age_acknowledged = !!ack;
        const okAck =
          !!ack &&
          (ar === '13+' ? ack.restriction === '13+' || ack.restriction === '18+' : ack.restriction === '18+');
        needs_age_ack_for_viewer = !okAck;
      }
      const bell = await prisma.liveCreatorBellSubscriber.findUnique({
        where: {
          subscriber_id_creator_id: { subscriber_id: readerUserId, creator_id: stream.creator_id },
        },
      });
      viewer_live_bell_subscribed = !!bell;
    }

    let viewer_join_access: ViewerJoinAccess | undefined;
    if (readerUserId && stream.status === 'live') {
      viewer_join_access = await this.getViewerJoinAccess(streamId, readerUserId);
    }

    return {
      ...stream,
      chat_messages: chatWithBadges,
      replay_chat_messages,
      replay_retention_days: retentionDays,
      viewer_age_acknowledged,
      needs_age_ack_for_viewer,
      viewer_live_bell_subscribed,
      viewer_join_access,
    };
  }

  /**
   * Ferme les `LiveStream` restés en `live` alors qu’ils sont abandonnés (zombies),
   * pour que la découverte / Moments ne « mentent » pas sur l’état réel.
   */
  async closeStaleLiveStreamsForPublicListing() {
    const now = new Date();
    const maxAgeMs = parseLiveMaxAgeDays() * 24 * 60 * 60 * 1000;
    const ageCutoff = new Date(Date.now() - maxAgeMs);
    const ancient = await prisma.liveStream.updateMany({
      where: { status: 'live', ended_at: null, started_at: { lt: ageCutoff } },
      data: { status: 'ended', ended_at: now },
    });

    const idleHours = parseLiveStaleIdleEndHours();
    let idle = { count: 0 as number };
    if (idleHours != null) {
      const idleCutoff = new Date(Date.now() - idleHours * 60 * 60 * 1000);
      idle = await prisma.liveStream.updateMany({
        where: {
          status: 'live',
          ended_at: null,
          viewers_count: 0,
          updated_at: { lt: idleCutoff },
        },
        data: { status: 'ended', ended_at: now },
      });
    }

    /** Flux « live » en base mais sans spectateur ni aucun signal (likes/messages/dons) depuis longtemps — cas fréquent en dev après abandon. */
    const quietHours = Math.max(1, parseInt(process.env.LIVE_ZERO_ENGAGEMENT_END_HOURS || '3', 10) || 3);
    const quietCutoff = new Date(Date.now() - quietHours * 60 * 60 * 1000);
    const quiet = await prisma.liveStream.updateMany({
      where: {
        status: 'live',
        ended_at: null,
        viewers_count: 0,
        total_messages: 0,
        total_likes: 0,
        total_gifts_amount: 0,
        total_tips_amount: 0,
        updated_at: { lt: quietCutoff },
      },
      data: { status: 'ended', ended_at: now },
    });

    if (ancient.count + idle.count + quiet.count > 0) {
      logger.info('Auto-ended stale live streams', {
        olderThanMaxAgeDays: ancient.count,
        idleNoViewers: idle.count,
        zeroEngagementHours: quiet.count > 0 ? quietHours : undefined,
        zeroEngagement: quiet.count,
        idleHours: idleHours ?? 'off',
        maxLiveAgeDays: parseLiveMaxAgeDays(),
      });
    }
  }

  async listStreams(
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      category?: string;
      featured?: boolean;
      region?: string;
      language?: string;
      sortBy?: string;
      creator_id?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.creator_id) {
      where.creator_id = String(filters.creator_id).trim();
    }
    if (filters?.status) {
      where.status = filters.status;
      if (filters.status === 'live') {
        await this.closeStaleLiveStreamsForPublicListing();
        const seed = await prisma.liveStream.findMany({
          where: { status: 'live', ended_at: null },
          select: { id: true },
          take: Math.min(Math.max(limit * 3, 12), 60),
          orderBy: [{ viewers_count: 'desc' }, { started_at: 'desc' }],
        });
        await Promise.all(
          seed.map((row) =>
            this.cleanupInactiveViewers(row.id).catch(() => 0)
          )
        );
        await this.closeStaleLiveStreamsForPublicListing();
        where.ended_at = null;
      }
    }
    if (filters?.category) where.category = filters.category;
    if (filters?.featured !== undefined) where.is_featured = filters.featured;
    if (filters?.region) where.region = filters.region;
    if (filters?.language) where.language = filters.language;

    const sortBy = filters?.sortBy || 'viewers';
    const orderBy: any[] = [{ status: 'asc' }];
    if (sortBy === 'recent') orderBy.push({ started_at: 'desc' });
    else if (sortBy === 'popularity') orderBy.push({ total_gifts_amount: 'desc' }, { total_likes: 'desc' });
    else if (sortBy === 'duration') orderBy.push({ duration_minutes: 'desc' });
    else orderBy.push({ viewers_count: 'desc' });

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        include: { creator: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true } } },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.liveStream.count({ where }),
    ]);
    for (const s of streams) {
      if (s.status === 'ended' && !String(s.thumbnail_url || '').trim()) {
        const src = pickLiveReplaySrc({
          replay_url: s.replay_url,
          playback_url: s.playback_url,
          stream_url: s.stream_url,
        });
        if (src) {
          void generateThumbnailForLiveStreamId(s.id, { internal: true, force: false }).catch(() => {});
        }
      }
    }
    return { streams, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Recommandations intelligentes basées sur l'activité utilisateur */
  async getRecommendations(userId: string | null, options?: { limit?: number; excludeLiveId?: string }) {
    await this.closeStaleLiveStreamsForPublicListing();
    const limit = Math.min(options?.limit ?? 10, 20);
    const where: any = { status: 'live', ended_at: null };
    if (options?.excludeLiveId) {
      where.id = { not: options.excludeLiveId };
    }

    // Si utilisateur connecté, recommandations personnalisées
    if (userId) {
      // 1. Lives des créateurs suivis (priorité haute)
      const followedCreators = await prisma.follow.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
      });
      const followedCreatorIds = followedCreators.map(f => f.following_id);

      if (followedCreatorIds.length > 0) {
        const followedLives = await prisma.liveStream.findMany({
          where: {
            ...where,
            creator_id: { in: followedCreatorIds },
          },
          orderBy: [
            { viewers_count: 'desc' },
            { started_at: 'desc' },
          ],
          take: Math.floor(limit * 0.4), // 40% des recommandations
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                profile_image: true,
                full_name: true,
              },
            },
          },
        });

        if (followedLives.length >= limit) {
          return followedLives;
        }
      }

      // 2. Catégories préférées basées sur l'historique
      let userLivesHistory: Array<{ live_stream: { category: string | null } | null }> = [];
      try {
        userLivesHistory = await prisma.liveViewer.findMany({
          where: { user_id: userId },
          include: { live_stream: { select: { category: true } } },
          take: 50,
        });
      } catch (error) {
        // Compat dev: certaines bases locales n'ont pas encore les colonnes LiveViewer.
        // On continue sans personnalisation plutôt que casser la route en 500.
        logger.warn('Live recommendations history unavailable, fallback to popular lives', {
          userId,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
      const categoryCounts = new Map<string, number>();
      userLivesHistory.forEach(v => {
        if (v.live_stream?.category) {
          categoryCounts.set(v.live_stream.category, (categoryCounts.get(v.live_stream.category) || 0) + 1);
        }
      });
      const topCategories = Array.from(categoryCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat]) => cat);

      // 3. Lives populaires dans les catégories préférées + trending
      const recommended = await prisma.liveStream.findMany({
        where: {
          ...where,
          ...(topCategories.length > 0 ? { category: { in: topCategories } } : {}),
        },
        orderBy: [
          { viewers_count: 'desc' },
          { total_likes: 'desc' },
          { started_at: 'desc' },
        ],
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              profile_image: true,
              full_name: true,
            },
          },
        },
      });

      return recommended;
    }

    // Si non connecté, retourner les lives les plus populaires
    return prisma.liveStream.findMany({
      where,
      orderBy: [
        { viewers_count: 'desc' },
        { total_likes: 'desc' },
        { started_at: 'desc' },
      ],
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profile_image: true,
            full_name: true,
          },
        },
      },
    });
  }

  /** Découverte : populaires, régionaux, par catégorie, des comptes suivis, trending (algorithme recommandation) */
  async getDiscovery(userId: string | null, options?: { type?: 'popular' | 'regional' | 'followed' | 'category' | 'trending'; region?: string; category?: string; limit?: number }) {
    await this.closeStaleLiveStreamsForPublicListing();
    const limit = Math.min(options?.limit ?? 20, 50);
    const where: any = { status: 'live', ended_at: null };

    if (options?.type === 'regional' && options?.region) {
      where.region = options.region;
    }
    if (options?.type === 'category' && options?.category) {
      where.category = options.category;
    }

    const orderBy: any[] = [{ viewers_count: 'desc' }, { started_at: 'desc' }];
    if (options?.type === 'followed' && userId) {
      const following = await prisma.follow.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
      });
      const creatorIds = following.map((f) => f.following_id);
      if (creatorIds.length === 0) return { streams: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
      where.creator_id = { in: creatorIds };
    }

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        include: { creator: { select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true } } },
        take: options?.type === 'trending' ? limit * 2 : limit,
        orderBy,
      }),
      prisma.liveStream.count({ where }),
    ]);

    // CDC: Algorithme recommandation trending — score = viewers*2 + total_gifts + total_likes
    if (options?.type === 'trending' && streams.length > 0) {
      const scored = streams
        .map((s) => ({
          ...s,
          _score: (s.viewers_count ?? 0) * 2 + (s.total_gifts_amount ?? 0) / 100 + (s.total_likes ?? 0),
        }))
        .sort((a, b) => (b._score || 0) - (a._score || 0))
        .slice(0, limit)
        .map(({ _score, ...rest }) => rest);
      return { streams: scored, pagination: { page: 1, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    return { streams, pagination: { page: 1, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** CDC: Don direct (tip) sans gift — 100–1M FCFA, 15% plateforme, tiers visuels */
  async sendTip(streamId: string, senderId: string, data: { amount: number; message?: string; is_anonymous?: boolean }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended.');
    if (stream.donations_enabled === false) throw new Error('Les dons sont désactivés.');

    const amount = Math.round(data.amount);
    if (amount < 100) throw new Error('Montant minimum: 100 FCFA');
    if (amount > 1_000_000) throw new Error('Montant maximum: 1 000 000 FCFA');

    const key = `${streamId}:${senderId}`;
    pruneGiftRateLimit(key);
    const recent = giftRateLimitMap.get(key) || [];
    if (recent.length >= GIFT_RATE_LIMIT_COUNT) {
      throw new Error(`Limite: max ${GIFT_RATE_LIMIT_COUNT} dons par 10 secondes.`);
    }
    recent.push(Date.now());
    giftRateLimitMap.set(key, recent);

    const wallet = await getOrCreateWallet(senderId);
    const bal = wallet.available_balance ?? wallet.balance ?? 0;
    if (bal < amount) throw new Error(`Solde insuffisant. Rechargez votre portefeuille.`);

    const msg = data.message?.slice(0, 200) || null;
    const { platform: platformCommission, creator: creatorEarnings } = commissionService.videoSocialLiveGift(amount);

    let tier = 'standard';
    if (amount >= 10000) tier = 'vip';
    else if (amount >= 5000) tier = 'premium';
    else if (amount >= 1000) tier = 'super';
    else if (amount >= 500) tier = 'featured';

    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          available_balance: { decrement: amount },
        },
      });

      const tip = await tx.liveTip.create({
        data: {
          live_id: streamId,
          sender_id: data.is_anonymous ? null : senderId,
          sender_name: data.is_anonymous ? 'Anonyme' : (await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User',
          sender_avatar: data.is_anonymous ? null : (await tx.user.findUnique({ where: { id: senderId }, select: { profile_image: true } }))?.profile_image || null,
          creator_id: stream.creator_id,
          amount,
          creator_earnings: creatorEarnings,
          platform_commission: platformCommission,
          message: msg,
          is_anonymous: data.is_anonymous ?? false,
          tier,
        },
      });

      const goalUpdate: Record<string, unknown> = { total_tips_amount: { increment: amount } };
      let goalReached = false;
      if (stream.goal_target != null && stream.goal_target > 0) {
        const current = stream.goal_amount ?? 0;
        const newGoalAmount = current + amount;
        goalUpdate.goal_amount = newGoalAmount;
        if (newGoalAmount >= stream.goal_target) goalReached = true;
      }
      await tx.liveStream.update({ where: { id: streamId }, data: goalUpdate });

      const chatMsg = data.is_anonymous
        ? `💵 Don anonyme: ${amount.toLocaleString()} FCFA`
        : `💵 ${(await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User'} : ${amount.toLocaleString()} FCFA${msg ? ` — ${msg}` : ''}`;
      const pinSeconds = tier === 'vip' ? 120 : tier === 'premium' ? 30 : 0;
      const pinExpiresAt = pinSeconds > 0 ? new Date(Date.now() + pinSeconds * 1000) : null;
      await tx.liveChat.create({
        data: {
          live_id: streamId,
          sender_id: senderId,
          sender_name: data.is_anonymous ? 'Anonyme' : (await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User',
          sender_avatar: data.is_anonymous ? null : (await tx.user.findUnique({ where: { id: senderId }, select: { profile_image: true } }))?.profile_image || null,
          message: chatMsg,
          message_type: 'gift',
          is_pinned: pinSeconds > 0,
          pin_expires_at: pinExpiresAt,
        },
      });
      await tx.liveStream.update({ where: { id: streamId }, data: { total_messages: { increment: 1 } } });

      const withdrawalService = (await import('./withdrawal.service.js')).default;
      const sellerWallet = await withdrawalService.getSellerWallet(stream.creator_id);
      await tx.sellerWallet.update({
        where: { id: sellerWallet.id },
        data: { balance: { increment: creatorEarnings } },
      });

      await tx.transaction.create({
        data: {
          user_id: senderId,
          type: 'live_tip_sent',
          amount: -amount,
          currency: 'XOF',
          status: 'completed',
          description: `Don live${data.is_anonymous ? ' (anonyme)' : ''}`,
          reference_id: tip.id,
          payment_method: 'wallet',
        },
      });
      await tx.transaction.create({
        data: {
          user_id: stream.creator_id,
          type: 'tip_received',
          amount: creatorEarnings,
          currency: 'XOF',
          status: 'completed',
          description: 'Don reçu pendant le live',
          reference_id: tip.id,
          payment_method: 'internal',
        },
      });
      return tip;
    });

    await platformRevenueService.addRevenue(platformCommission, 'live_gifts', `Commission tip live`, result.id);
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:tip', { ...result, tier });
    const streamAfter = await prisma.liveStream.findUnique({ where: { id: streamId }, select: { goal_amount: true, goal_target: true, creator_id: true } });
    if (streamAfter?.goal_target && streamAfter.goal_target > 0 && (streamAfter.goal_amount ?? 0) >= streamAfter.goal_target) {
      try {
        await notificationService.create(streamAfter.creator_id, {
          type: 'live_goal_reached',
          title: 'Objectif atteint !',
          message: `Félicitations ! Votre objectif de ${streamAfter.goal_target.toLocaleString()} FCFA a été atteint.`,
          reference_type: 'live',
          reference_id: streamId,
        });
      } catch (_) {}
    }
    return { ...result, tier };
  }

  /** Cadeau: vérif status, wallet, transaction atomique, rate limit */
  async sendGift(streamId: string, senderId: string, data: {
    giftId: string;
    giftName: string;
    giftIcon: string;
    amount: number;
    quantity: number;
    message?: string;
    battle_side?: 'challenger' | 'opponent';
  }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended. Gifts are disabled.');
    if (stream.donations_enabled === false) throw new Error('Les dons sont désactivés.');

    const giftCatalog = await this.getGiftCatalog();
    const giftConfig = giftCatalog.find((g) => g.id === data.giftId);
    if (!giftConfig) throw new Error('Cadeau introuvable');

    const unitCoins = Number(giftConfig.coin_value ?? giftConfig.price);
    if (!Number.isFinite(unitCoins) || unitCoins <= 0) throw new Error('Cadeau invalide (coins)');
    const totalCoins = Math.round(unitCoins * data.quantity);
    /** FCFA équivalent pour stats / objectifs / commissions (coins × taux documenté). */
    const totalAmountFcfa = Math.round(totalCoins * COIN_FCFA_APPROX_PURCHASE_PER_COIN);
    const unitFcfa = Math.round(unitCoins * COIN_FCFA_APPROX_PURCHASE_PER_COIN);
    if (totalCoins < 1) throw new Error('Quantité invalide');
    if (totalAmountFcfa > 1_000_000) throw new Error('Montant maximum pour un don live: 1 000 000 FCFA');

    const key = `${streamId}:${senderId}`;
    pruneGiftRateLimit(key);
    const recent = giftRateLimitMap.get(key) || [];
    if (recent.length >= GIFT_RATE_LIMIT_COUNT) {
      throw new Error(`Limite: max ${GIFT_RATE_LIMIT_COUNT} cadeaux par 10 secondes.`);
    }
    recent.push(Date.now());
    giftRateLimitMap.set(key, recent);

    const coinsWallet = await coinsService.getOrCreateCoinsWallet(senderId);
    const bal = coinsWallet.available_balance ?? coinsWallet.balance ?? 0;
    if (bal < totalCoins) {
      throw new Error(`Solde coins insuffisant. Votre solde: ${Math.round(bal).toLocaleString()} coins.`);
    }

    // CDC: message accompagnant le don max 200 caractères
    if (data.message && data.message.length > 200) {
      data.message = data.message.slice(0, 200);
    }

    const { platform: platformCommission, creator: creatorEarnings } = commissionService.videoSocialLiveGift(totalAmountFcfa);

    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: coinsWallet.id },
        data: {
          balance: { decrement: totalCoins },
          available_balance: { decrement: totalCoins },
        },
      });

      const gift = await tx.liveGift.create({
        data: {
          live_id: streamId,
          sender_id: senderId,
          sender_name: (await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User',
          sender_avatar: (await tx.user.findUnique({ where: { id: senderId }, select: { profile_image: true } }))?.profile_image || null,
          creator_id: stream.creator_id,
          gift_id: data.giftId,
          gift_name: data.giftName,
          gift_icon: data.giftIcon,
          amount: unitFcfa,
          quantity: data.quantity,
          total_amount: totalAmountFcfa,
          creator_earnings: creatorEarnings,
          platform_commission: platformCommission,
          message: data.message,
        },
      });

      const goalUpdate: Record<string, unknown> = { total_gifts_amount: { increment: totalAmountFcfa } };
      if (stream.goal_target != null && stream.goal_target > 0) {
        const current = stream.goal_amount ?? 0;
        goalUpdate.goal_amount = current + totalAmountFcfa;
      }
      await tx.liveStream.update({ where: { id: streamId }, data: goalUpdate });

      await tx.liveChat.create({
        data: {
          live_id: streamId,
          sender_id: senderId,
          sender_name: (await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User',
          sender_avatar: (await tx.user.findUnique({ where: { id: senderId }, select: { profile_image: true } }))?.profile_image || null,
          message: data.message ? `🎁 ${data.giftName} x${data.quantity} — ${data.message}` : `🎁 ${data.giftName} x${data.quantity}`,
          message_type: 'gift',
        },
      });

      await tx.liveStream.update({
        where: { id: streamId },
        data: { total_messages: { increment: 1 } },
      });

      const withdrawalService = (await import('./withdrawal.service.js')).default;
      const sellerWallet = await withdrawalService.getSellerWallet(stream.creator_id);
      await tx.sellerWallet.update({
        where: { id: sellerWallet.id },
        data: { balance: { increment: creatorEarnings } },
      });

      await tx.transaction.create({
        data: {
          user_id: senderId,
          type: 'live_gift_sent',
          amount: -totalAmountFcfa,
          currency: 'XOF',
          status: 'completed',
          description: `Cadeau live: ${data.giftName} x${data.quantity}`,
          reference_id: gift.id,
          payment_method: 'wallet',
        },
      });

      await tx.transaction.create({
        data: {
          user_id: stream.creator_id,
          type: 'gift_received',
          amount: creatorEarnings,
          currency: 'XOF',
          status: 'completed',
          description: `Gift reçu pendant le live`,
          reference_id: gift.id,
          payment_method: 'internal',
        },
      });

      return gift;
    });

    await platformRevenueService.addRevenue(platformCommission, 'live_gifts', `Commission gift live - ${data.giftName}`, result.id);

    const combo = computeGiftCombo(streamId, senderId, data.giftId);
    const io = getIO();
    if (io) {
      const ce = Number(result.creator_earnings ?? creatorEarnings);
      const ta = Number(result.total_amount ?? totalAmountFcfa);
      io.to(`stream:${streamId}`).emit('live:gift', {
        id: result.id,
        live_id: result.live_id,
        sender_id: result.sender_id,
        sender_name: result.sender_name,
        sender_avatar: result.sender_avatar,
        gift_id: result.gift_id,
        gift_name: result.gift_name,
        gift_icon: result.gift_icon,
        quantity: result.quantity,
        total_amount: ta,
        creator_earnings: ce,
        creator_earnings_fcfa: ce,
        total_amount_fcfa: ta,
        combo,
        rarity: giftConfig.rarity ?? 'common',
        animation_url: giftConfig.animation_url ?? null,
      });
    }

    const streamAfter = await prisma.liveStream.findUnique({ where: { id: streamId }, select: { goal_amount: true, goal_target: true, creator_id: true } });
    if (streamAfter?.goal_target && streamAfter.goal_target > 0 && (streamAfter.goal_amount ?? 0) >= streamAfter.goal_target) {
      try {
        await notificationService.create(streamAfter.creator_id, {
          type: 'live_goal_reached',
          title: 'Objectif atteint !',
          message: `Félicitations ! Votre objectif de ${streamAfter.goal_target.toLocaleString()} FCFA a été atteint.`,
          reference_type: 'live',
          reference_id: streamId,
        });
      } catch (_) {}
    }

    logger.info('Live gift sent', { streamId, senderId, giftId: result.id, totalAmountFcfa, totalCoins, combo });

    if (data.battle_side === 'challenger' || data.battle_side === 'opponent') {
      try {
        const { liveBattleService } = await import('./liveBattle.service.js');
        await liveBattleService.applyGiftScore(streamId, data.battle_side, totalAmountFcfa);
      } catch {
        /* battle best-effort */
      }
    }

    return { ...result, combo };
  }

  /** Chat: 5 msg/min, slow mode, emoji_only, slash commands (/ban, /timeout, /clear) */
  async sendChatMessage(
    streamId: string,
    userId: string,
    message: string,
    options?: { is_question?: boolean },
  ) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { moderation_settings: true },
    });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended. Chat is closed.');

    const settings = stream.moderation_settings;
    if (settings && !settings.comments_enabled) throw new Error('Comments are disabled by the host.');

    const rawMsg = (message || '').trim();
    if (!rawMsg) throw new Error('Message vide.');

    const isCreator = stream.creator_id === userId;
    const isMod = await prisma.liveModerator.findFirst({
      where: { live_id: streamId, user_id: userId },
    });
    const canModerate = !!(isCreator || isMod);
    const maxChatLen = isCreator ? 500 : 150;
    if (rawMsg.length > maxChatLen) {
      throw new Error(
        isCreator ? 'Message trop long (max 500 caractères pour l’hôte).' : 'Message trop long (max 150 caractères).',
      );
    }

    if (rawMsg.startsWith('/') && canModerate) {
      const parts = rawMsg.slice(1).split(/\s+/);
      const cmd = parts[0].toLowerCase();
      if (cmd === 'ban' && parts[1]) {
        const targetUsername = parts.slice(1).join(' ');
        const targetUser = await prisma.user.findFirst({ where: { username: targetUsername } });
        if (targetUser) {
          await this.banUser(streamId, targetUser.id, userId, 'Commande /ban', { permanent: true });
          return { type: 'system', message: `Utilisateur ${targetUsername} banni.` } as any;
        }
      }
      if (cmd === 'timeout' && parts[1]) {
        const targetUsername = parts[1];
        const mins = parseInt(parts[2]) || 5;
        const targetUser = await prisma.user.findFirst({ where: { username: targetUsername } });
        if (targetUser) {
          await this.banUser(streamId, targetUser.id, userId, 'Timeout', { durationMinutes: mins });
          return { type: 'system', message: `Timeout ${mins} min pour ${targetUsername}.` } as any;
        }
      }
      if (cmd === 'clear') {
        await prisma.liveChat.updateMany({ where: { live_id: streamId }, data: { is_deleted: true } });
        const io = getIO();
        if (io) io.to(`stream:${streamId}`).emit('live:chat:clear');
        return { type: 'system', message: 'Chat effacé.' } as any;
      }
    }

    const emojiOnly = /^[\p{Emoji}\s]+$/u;
    if (settings?.emoji_only && !emojiOnly.test(rawMsg)) {
      throw new Error('Mode emoji uniquement. Envoyez uniquement des emojis.');
    }

    const ban = await prisma.liveStreamBan.findFirst({
      where: { live_id: streamId, user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    if (ban) {
      if (ban.is_permanent) throw new Error('You are banned from this stream.');
      if (ban.expires_at && ban.expires_at > new Date()) throw new Error('You are temporarily muted.');
    }

    if (!canModerate) {
      const oneMinuteAgo = new Date(Date.now() - 60_000);
      const recentChatCount = await prisma.liveChat.count({
        where: {
          live_id: streamId,
          sender_id: userId,
          created_date: { gte: oneMinuteAgo },
          is_deleted: false,
        },
      });
      let perMinute = 5;
      const [sub, u] = await Promise.all([
        prisma.liveCreatorSubscription.findFirst({
          where: { subscriber_id: userId, creator_id: stream.creator_id, status: 'active' },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { is_verified: true } }),
      ]);
      if (sub) perMinute = 25;
      else if (u?.is_verified) perMinute = 12;
      if (recentChatCount >= perMinute) {
        throw new Error(
          perMinute > 5
            ? `Maximum ${perMinute} messages par minute (abonnement live créateur ou compte vérifié).`
            : 'Maximum 5 messages par minute.',
        );
      }
    }

    const slowModeSec = settings?.slow_mode_seconds ?? 0;
    if (slowModeSec > 0 && settings) {
      const lastMsg = await prisma.liveChat.findFirst({
        where: { live_id: streamId, sender_id: userId },
        orderBy: { created_date: 'desc' },
      });
      if (lastMsg) {
        const elapsed = (Date.now() - lastMsg.created_date.getTime()) / 1000;
        if (elapsed < slowModeSec) {
          throw new Error(`Slow mode: attendez ${slowModeSec} secondes.`);
        }
      }
    }

    const extraBanned = (process.env.LIVE_EXTRA_BANNED_WORDS || '')
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const bannedWords = [...(((settings?.banned_words as string[]) || []) as string[]), ...extraBanned];
    let cleanMessage = rawMsg.slice(0, maxChatLen);
    for (const word of bannedWords) {
      const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanMessage = cleanMessage.replace(re, '***');
    }
    cleanMessage = maskProfanityFr(cleanMessage);
    if (!cleanMessage.trim()) throw new Error('Message vide.');

    const isQuestion =
      options?.is_question === true
        ? true
        : cleanMessage.includes('?') && !cleanMessage.startsWith('/');

    if (settings?.followers_only) {
      const follow = await prisma.follow.findUnique({
        where: { follower_id_following_id: { follower_id: userId, following_id: stream.creator_id } },
      });
      if (!follow) throw new Error('Only followers can comment.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile_image: true },
    });
    const senderRole = isCreator ? 'creator' : (isMod ? 'moderator' : 'viewer');

    const chatMessage = await prisma.liveChat.create({
      data: {
        live_id: streamId,
        sender_id: userId,
        sender_name: user?.username || 'Unknown',
        sender_avatar: user?.profile_image || null,
        sender_role: senderRole,
        message: cleanMessage,
        message_type: 'text',
        is_question: isQuestion,
        is_answered: false,
      },
    });

    await prisma.liveStream.update({
      where: { id: streamId },
      data: { total_messages: { increment: 1 } },
    });

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:chat', chatMessage);

    // CDC: Mentions @username — notifier les utilisateurs mentionnés
    const mentionRegex = /@(\w+)/g;
    let m;
    const mentionedUsernames = new Set<string>();
    while ((m = mentionRegex.exec(cleanMessage)) !== null) mentionedUsernames.add(m[1]);
    if (mentionedUsernames.size > 0) {
      const mentioned = await prisma.user.findMany({
        where: { username: { in: [...mentionedUsernames] } },
        select: { id: true },
      });
      const senderName = user?.username || 'Quelqu\'un';
      for (const u of mentioned) {
        if (u.id !== userId) {
          try {
            await notificationService.create(u.id, {
              type: 'live_mention',
              title: 'Mention dans un live',
              message: `${senderName} vous a mentionné dans le chat : ${cleanMessage.slice(0, 80)}...`,
              reference_type: 'live',
              reference_id: streamId,
            });
          } catch (_) {}
        }
      }
    }

    return chatMessage;
  }

  /** Commentaires après fin du live (séparés du chat temps réel : message_type replay_comment) */
  async sendReplayComment(streamId: string, userId: string, message: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'ended') throw new Error('Les commentaires replay sont disponibles une fois le live terminé.');

    const rawMsg = (message || '').trim();
    if (!rawMsg) throw new Error('Message vide.');
    const maxLen = 150;
    if (rawMsg.length > maxLen) throw new Error(`Message trop long (max ${maxLen} caractères).`);

    const ban = await prisma.liveStreamBan.findFirst({
      where: { live_id: streamId, user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    if (ban) {
      if (ban.is_permanent) throw new Error('You are banned from this stream.');
      if (ban.expires_at && ban.expires_at > new Date()) throw new Error('You are temporarily muted.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile_image: true },
    });
    const isCreator = stream.creator_id === userId;
    const isMod = await prisma.liveModerator.findFirst({
      where: { live_id: streamId, user_id: userId },
    });
    const senderRole = isCreator ? 'creator' : (isMod ? 'moderator' : 'viewer');

    const chatMessage = await prisma.liveChat.create({
      data: {
        live_id: streamId,
        sender_id: userId,
        sender_name: user?.username || 'Unknown',
        sender_avatar: user?.profile_image || null,
        sender_role: senderRole,
        message: rawMsg.slice(0, maxLen),
        message_type: 'replay_comment',
        is_question: false,
        is_answered: false,
      },
    });

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:replay:comment', chatMessage);

    return chatMessage;
  }

  /** CDC: Réaction (heart, fire, thumbs, clap) */
  async reaction(streamId: string, userId: string, reactionType: 'like' | 'heart' | 'fire' | 'thumbs' | 'clap') {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended.');

    const rKey = `${streamId}:${userId}`;
    const now = Date.now();
    const lastR = liveReactionCooldown.get(rKey) ?? 0;
    if (now - lastR < LIVE_REACTION_MIN_MS) {
      const err: any = new Error('Réactions : attendez un instant entre deux animations.');
      err.statusCode = 429;
      err.isOperational = true;
      err.code = 'LIVE_REACTION_COOLDOWN';
      throw err;
    }
    liveReactionCooldown.set(rKey, now);

    await prisma.liveLike.create({
      data: { live_id: streamId, user_id: userId, reaction_type: reactionType },
    });

    const updated = await prisma.liveStream.update({
      where: { id: streamId },
      data: { total_likes: { increment: 1 } },
    });

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:like', { count: updated.total_likes, reactionType });

    return { total_likes: updated.total_likes, reactionType };
  }

  async like(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended.');

    await prisma.liveLike.create({
      data: { live_id: streamId, user_id: userId, reaction_type: 'like' },
    });

    const updated = await prisma.liveStream.update({
      where: { id: streamId },
      data: { total_likes: { increment: 1 } },
    });

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:like', { count: updated.total_likes });

    return { total_likes: updated.total_likes };
  }

  /** D: replay_url optionnel (webhook enregistrement ou manuel). Calcule total_watch_time, viewer_countries, retention. */
  async endStream(streamId: string, userId: string, options?: { replay_url?: string }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Stream not found or unauthorized');

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - stream.started_at.getTime()) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);

    const viewers = await prisma.liveViewer.findMany({
      where: { live_id: streamId },
      select: { user_id: true, watch_duration: true, joined_at: true, left_at: true, country: true, city: true },
    });
    const uniqueViewers = await prisma.liveViewer.groupBy({
      by: ['user_id'],
      where: { live_id: streamId },
    });
    const totalWatchTime = viewers.reduce((sum, v) => sum + (v.watch_duration ?? 0), 0);
    const avgWatchTime = uniqueViewers.length > 0 ? Math.round(totalWatchTime / uniqueViewers.length) : 0;

    const viewerCountries: Record<string, number> = {};
    for (const v of viewers) {
      const c = v.country || 'unknown';
      viewerCountries[c] = (viewerCountries[c] || 0) + 1;
    }
    const viewerCities: Record<string, number> = {};
    for (const v of viewers) {
      const ct = String(v.city || '').trim();
      if (!ct) continue;
      viewerCities[ct] = (viewerCities[ct] || 0) + 1;
    }
    const retentionBuckets = [
      { min: 0, max: 60, count: viewers.filter((v) => (v.watch_duration ?? 0) < 60).length },
      { min: 60, max: 300, count: viewers.filter((v) => (v.watch_duration ?? 0) >= 60 && (v.watch_duration ?? 0) < 300).length },
      { min: 300, max: 900, count: viewers.filter((v) => (v.watch_duration ?? 0) >= 300 && (v.watch_duration ?? 0) < 900).length },
      { min: 900, max: 3600, count: viewers.filter((v) => (v.watch_duration ?? 0) >= 900 && (v.watch_duration ?? 0) < 3600).length },
      { min: 3600, max: -1, count: viewers.filter((v) => (v.watch_duration ?? 0) >= 3600).length },
    ];

    const updateData: Record<string, unknown> = {
      status: 'ended',
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      total_watch_time: totalWatchTime,
    };
    if (options?.replay_url) updateData.replay_url = options.replay_url;

    await prisma.liveStream.update({
      where: { id: streamId },
      data: updateData,
    });

    // CDC: Notification « replay disponible » aux abonnés
    const finalReplayUrl = options?.replay_url ?? stream.replay_url;
    if (finalReplayUrl) {
      try {
        const followers = await prisma.follow.findMany({
          where: { following_id: stream.creator_id },
          select: { follower_id: true },
        });
        const creatorName = (await prisma.user.findUnique({ where: { id: stream.creator_id }, select: { username: true } }))?.username || 'Créateur';
        for (const f of followers) {
          try {
            await notificationService.create(f.follower_id, {
              type: 'live_replay_available',
              title: 'Replay disponible',
              message: `${creatorName} a publié le replay : ${stream.title}`,
              reference_type: 'live',
              reference_id: streamId,
            });
          } catch (_) {}
        }
        if (followers.length) logger.info('Notifications replay envoyées', { streamId, count: followers.length });
      } catch (e) {
        logger.warn('Erreur notif replay', { streamId });
      }
    }

    await prisma.liveAnalytics.create({
      data: {
        live_id: streamId,
        total_viewers: stream.viewers_count,
        peak_viewers: stream.peak_viewers,
        unique_viewers: uniqueViewers.length,
        total_gifts_value: stream.total_gifts_amount,
        total_messages: stream.total_messages,
        total_likes: stream.total_likes,
        duration_seconds: durationSeconds,
        average_watch_time_seconds: avgWatchTime,
        viewer_countries: viewerCountries,
        viewer_cities: Object.keys(viewerCities).length ? viewerCities : undefined,
        retention_buckets: retentionBuckets,
      },
    });

    const creatorLevel = await prisma.creatorLevel.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        level: 1,
        total_earnings: commissionService.videoSocialLiveGift(stream.total_gifts_amount).creator,
        total_streams: 1,
        updated_at: new Date(),
      },
      update: {
        total_earnings: { increment: commissionService.videoSocialLiveGift(stream.total_gifts_amount).creator },
        total_streams: { increment: 1 },
        updated_at: new Date(),
      },
    });

    const topDonors = await prisma.liveGift.groupBy({
      by: ['sender_id'],
      where: { live_id: streamId },
      _sum: { total_amount: true },
    });
    const sorted = topDonors
      .map((t) => ({ user_id: t.sender_id, total: t._sum.total_amount || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    for (let i = 0; i < sorted.length; i++) {
      await prisma.liveTopDonor.upsert({
        where: { live_id_user_id: { live_id: streamId, user_id: sorted[i].user_id } },
        create: { live_id: streamId, user_id: sorted[i].user_id, total_amount: sorted[i].total, rank: i + 1 },
        update: { total_amount: sorted[i].total, rank: i + 1 },
      });
    }

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:ended', { streamId, replayUrl: finalReplayUrl ?? null });

    liveBroadcastTimers.delete(streamId);
    if (io) io.to(`stream:${streamId}`).emit('live:timer', null);

    try {
      await this.maybeAutoPublishReplayToFeedVideo({
        liveId: streamId,
        creatorId: userId,
        title: stream.title,
        thumbnail_url: stream.thumbnail_url,
        replayUrl: typeof finalReplayUrl === 'string' ? finalReplayUrl : null,
        durationMinutes,
      });
    } catch (e) {
      logger.warn('Auto-publish replay → feed ignoré', { streamId, err: e });
    }

    logger.info('Live stream ended', { streamId, userId, durationMinutes });

    const thumbSrcRow = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { replay_url: true, playback_url: true, stream_url: true },
    });
    if (thumbSrcRow && pickLiveReplaySrc(thumbSrcRow)) {
      void generateThumbnailForLiveStreamId(streamId, { internal: true, force: false }).catch(() => {});
    }

    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  async getModerationSettings(streamId: string) {
    return prisma.liveModerationSettings.findUnique({ where: { live_id: streamId } });
  }

  async updateModerationSettings(streamId: string, userId: string, data: {
    slow_mode_seconds?: number;
    comments_enabled?: boolean;
    followers_only?: boolean;
    emoji_only?: boolean;
    banned_words?: string[];
  }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    return prisma.liveModerationSettings.upsert({
      where: { live_id: streamId },
      create: { live_id: streamId, ...data },
      update: data,
    });
  }

  async addModerator(streamId: string, creatorId: string, moderatorUserId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    return prisma.liveModerator.create({
      data: { live_id: streamId, user_id: moderatorUserId },
    });
  }

  async removeModerator(streamId: string, creatorId: string, moderatorUserId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    await prisma.liveModerator.deleteMany({
      where: { live_id: streamId, user_id: moderatorUserId },
    });
    return { ok: true };
  }

  async banUser(streamId: string, userId: string, bannedBy: string, reason: string, options?: { durationMinutes?: number; permanent?: boolean }) {
    const expiresAt = options?.permanent ? null : (options?.durationMinutes
      ? new Date(Date.now() + options.durationMinutes * 60 * 1000)
      : new Date(Date.now() + 5 * 60 * 1000));
    const ban = await prisma.liveStreamBan.create({
      data: {
        live_id: streamId,
        user_id: userId,
        reason,
        banned_by: bannedBy,
        is_permanent: options?.permanent ?? false,
        expires_at: expiresAt,
      },
    });
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:banned', { userId, reason });
    return ban;
  }

  async deleteChatMessage(streamId: string, messageId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    const isCreator = stream.creator_id === userId;
    const isMod = await prisma.liveModerator.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
    });
    if (!isCreator && !isMod) throw new Error('Unauthorized');
    await prisma.liveChat.update({
      where: { id: messageId },
      data: { is_deleted: true, is_pinned: false },
    });
    return { ok: true };
  }

  /** Mettre à jour un message chat (is_answered, is_question, etc.) */
  async updateChatMessage(streamId: string, messageId: string, userId: string, updates: { is_answered?: boolean; is_question?: boolean; [key: string]: any }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    
    const message = await prisma.liveChat.findUnique({ where: { id: messageId } });
    if (!message || message.live_id !== streamId) throw new Error('Message not found');
    
    // Seul le créateur ou un modérateur peut mettre à jour
    const isCreator = stream.creator_id === userId;
    const isModerator = await prisma.liveModerator.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
    });
    
    if (!isCreator && !isModerator) throw new Error('Unauthorized');
    
    const updated = await prisma.liveChat.update({
      where: { id: messageId },
      data: updates,
    });
    
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:chat:updated', updated);
    
    return updated;
  }

  /** Épingler / désépingler un message (créateur ou modérateur) */
  async pinChatMessage(streamId: string, messageId: string, userId: string, pin: boolean) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    const isCreator = stream.creator_id === userId;
    const isMod = await prisma.liveModerator.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
    });
    if (!isCreator && !isMod) throw new Error('Unauthorized');
    if (pin) {
      await prisma.liveChat.updateMany({
        where: { live_id: streamId },
        data: { is_pinned: false },
      });
    }
    await prisma.liveChat.update({
      where: { id: messageId },
      data: { is_pinned: pin },
    });
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:pin', { messageId, pin });
    return { ok: true, pinned: pin };
  }

  /** Supprimer l’URL de replay (créateur) */
  async deleteReplay(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Stream not found or unauthorized');
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { replay_url: null },
    });
    return { ok: true };
  }

  /** Mettre à jour l’URL de replay (créateur ou webhook) */
  async updateReplayUrl(streamId: string, userId: string | null, replayUrl: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (userId && stream.creator_id !== userId) throw new Error('Unauthorized');
    const hadReplay = !!stream.replay_url;
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { replay_url: replayUrl },
    });
    // CDC: Notifier abonnés si replay ajouté (et pas déjà notifié via endStream)
    if (!hadReplay && stream.status === 'ended') {
      try {
        const followers = await prisma.follow.findMany({
          where: { following_id: stream.creator_id },
          select: { follower_id: true },
        });
        const creatorName = (await prisma.user.findUnique({ where: { id: stream.creator_id }, select: { username: true } }))?.username || 'Créateur';
        for (const f of followers) {
          try {
            await notificationService.create(f.follower_id, {
              type: 'live_replay_available',
              title: 'Replay disponible',
              message: `${creatorName} a publié le replay : ${stream.title}`,
              reference_type: 'live',
              reference_id: streamId,
            });
          } catch (_) {}
        }
      } catch (_) {}
    }
    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  /** Catalogue des cadeaux (pour live) */
  async getGiftCatalog(category?: string) {
    const where: any = { is_active: true };
    if (category) where.category = category;
    const gifts = await prisma.gift.findMany({
      where,
      orderBy: [{ rarity: 'asc' }, { price: 'asc' }],
    });
    return gifts.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      animation_url: g.animation_url,
      price: g.price,
      coin_value: g.coin_value ?? g.price,
      category: g.category,
      rarity: g.rarity || 'common',
    }));
  }

  async getTopDonors(streamId: string, limit = 10) {
    const gifts = await prisma.liveGift.findMany({
      where: { live_id: streamId },
      select: {
        sender_id: true,
        sender_name: true,
        sender_avatar: true,
        total_amount: true,
        quantity: true,
      },
    });
    if (gifts.length > 0) {
      const map = new Map<
        string,
        {
          sender_id: string;
          sender_name: string;
          sender_avatar: string | null;
          total_amount_fcfa: number;
          gift_events: number;
        }
      >();
      for (const g of gifts) {
        const cur = map.get(g.sender_id) || {
          sender_id: g.sender_id,
          sender_name: g.sender_name,
          sender_avatar: g.sender_avatar,
          total_amount_fcfa: 0,
          gift_events: 0,
        };
        cur.total_amount_fcfa += g.total_amount;
        cur.gift_events += g.quantity;
        map.set(g.sender_id, cur);
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.total_amount_fcfa - a.total_amount_fcfa);
      return sorted.slice(0, Math.min(100, Math.max(1, limit))).map((row, i) => ({
        rank: i + 1,
        source: 'live_gift_aggregate',
        ...row,
      }));
    }
    const donors = await prisma.liveTopDonor.findMany({
      where: { live_id: streamId },
      orderBy: { rank: 'asc' },
      take: limit,
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    return donors;
  }

  /** CDC 6.4 — Hall of Fame : tops donateurs agrégés sur tous les lives du créateur. */
  async getGiftHallOfFameForCreator(creatorId: string, limit = 30) {
    const take = Math.min(100, Math.max(1, Math.floor(limit)));
    const rows = await prisma.liveGift.groupBy({
      by: ['sender_id', 'sender_name'],
      where: { creator_id: creatorId },
      _sum: { total_amount: true },
      _count: { id: true },
      orderBy: { _sum: { total_amount: 'desc' } },
      take,
    });
    const out = [];
    let idx = 0;
    for (const r of rows) {
      idx += 1;
      const av = await prisma.user.findUnique({
        where: { id: r.sender_id },
        select: { profile_image: true },
      });
      out.push({
        rank: idx,
        sender_id: r.sender_id,
        sender_name: r.sender_name,
        sender_avatar: av?.profile_image || null,
        total_amount_fcfa: r._sum.total_amount ?? 0,
        gift_events: r._count.id,
      });
    }
    return out;
  }

  /** Créateur : ajuster la rétention replay stockée (jours, ex. 3 = 72 h si aligné env). */
  async updateStreamReplayRetention(streamId: string, creatorId: string, replay_retention_days: number) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Non autorisé');
    const days = Math.floor(Number(replay_retention_days));
    if (!Number.isFinite(days) || days < 1 || days > 36500) throw new Error('Durée de rétention invalide (1–36500 jours).');
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { replay_retention_days: days },
    });
    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  async getAnalytics(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    const analytics = await prisma.liveAnalytics.findUnique({ where: { live_id: streamId } });
    const topDonors = await this.getTopDonors(streamId, 5);
    return { stream: { id: stream.id, title: stream.title, total_gifts_amount: stream.total_gifts_amount, duration_minutes: stream.duration_minutes }, analytics, topDonors };
  }

  async getCreatorLevel(userId: string) {
    const level = await prisma.creatorLevel.findUnique({ where: { user_id: userId } });
    return level || { user_id: userId, level: 1, total_earnings: 0, total_streams: 0 };
  }

  /** Legacy: update viewers count (préférer join/leave/heartbeat) */
  async updateViewers(streamId: string, count: number) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    const peak = Math.max(count, stream.peak_viewers);
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { viewers_count: count, peak_viewers: peak },
    });
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:viewers', { count });
    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  async getWallet(userId: string) {
    return getOrCreateWallet(userId);
  }

  /** B: Recharge wallet — initie paiement Orange Money, callback crédite le wallet */
  async rechargeWallet(userId: string, amount: number, phone?: string) {
    if (amount < 100 || amount > 1_000_000) throw new Error('Montant entre 100 et 1 000 000 FCFA');
    const tx = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'wallet_recharge',
        amount,
        currency: 'XOF',
        status: 'pending',
        description: 'Recharge portefeuille Live',
        reference_id: null,
        payment_method: 'orange_money',
      },
    });
    const baseUrl = process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:5173';
    const returnUrl = `${baseUrl}/RechargeWallet?transactionId=${tx.id}`;

    // Mode simulation : si Orange Money non configuré en dev, simule une redirection immédiate
    const merchantId = process.env.ORANGE_MONEY_MERCHANT_ID || process.env.VITE_ORANGE_MERCHANT_ID;
    const apiKey = process.env.ORANGE_MONEY_API_KEY || process.env.VITE_ORANGE_API_KEY;
    const useMock = !merchantId || !apiKey;
    // Hors production : sans clés Orange, simulation (NODE_ENV absent ex. tsx watch n’est pas toujours "development").
    const allowMockWithoutOrange =
      process.env.NODE_ENV !== 'production' || process.env.ORANGE_MONEY_MOCK === 'true';

    if (useMock && allowMockWithoutOrange) {
      logger.info('Recharge wallet en mode simulation (Orange Money non configuré)', { userId, amount, transactionId: tx.id });
      const mockReturnUrl = `${baseUrl}/RechargeWallet?transactionId=${tx.id}&mockOrange=1`;
      return { transaction_id: tx.id, payment_url: mockReturnUrl, amount, mock: true };
    }

    if (useMock) {
      throw new Error('Orange Money Mali non configuré. Vérifiez ORANGE_MONEY_MERCHANT_ID et ORANGE_MONEY_API_KEY');
    }

    const phoneNorm = normalizeOrangeMoneySubscriberMl(phone || '') || String(phone || '').replace(/\D/g, '');
    const result = await paymentService.initiateOrangeMoneyPayment(userId, tx.id, {
      amount,
      phone: phoneNorm,
      returnUrl,
    });
    const paymentUrl = result.paymentUrl;
    if (!paymentUrl || typeof paymentUrl !== 'string') {
      throw new Error(
        "Orange Money n'a pas renvoyé d'URL de paiement. Vérifie la configuration marchande et l'API Orange.",
      );
    }
    return { transaction_id: tx.id, payment_url: paymentUrl, amount, mock: false };
  }

  /**
   * Hors prod (ou ORANGE_MONEY_MOCK) : après saisie d'un code à l'écran (simulation du secret Orange).
   * En production réelle, le PIN est demandé par Orange (page web / USSD), pas par cette route.
   */
  async confirmWalletRechargeAfterMockOrangePin(userId: string, transactionId: string, _pin: string) {
    const allow =
      process.env.NODE_ENV !== 'production' || process.env.ORANGE_MONEY_MOCK === 'true';
    if (!allow) {
      throw new Error('Confirmation simulée non disponible en production');
    }
    if (!/^\d{4,6}$/.test(_pin)) {
      throw new Error('Code invalide (4 à 6 chiffres)');
    }
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, user_id: userId, type: 'wallet_recharge', status: 'pending' },
    });
    if (!tx) throw new Error('Transaction introuvable ou déjà traitée');
    return this.confirmWalletRecharge(transactionId, userId);
  }

  /** Statut d’une recharge (polling après retour Orange ; crédit via webhook en prod). */
  async getWalletRechargeStatus(userId: string, transactionId: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, user_id: userId, type: 'wallet_recharge' },
      select: { status: true, amount: true, id: true },
    });
    if (!tx) return null;
    return { status: tx.status, amount: tx.amount, transaction_id: tx.id };
  }

  /** B: Confirmer recharge (webhook, mock, ou fallback dev — voir allowReturnConfirm) */
  async confirmWalletRecharge(transactionId: string, userId?: string) {
    const where: { id: string; type: 'wallet_recharge'; status: 'pending'; user_id?: string } = {
      id: transactionId,
      type: 'wallet_recharge',
      status: 'pending',
    };
    if (userId) where.user_id = userId;

    const tx = await prisma.transaction.findFirst({
      where,
    });
    if (!tx) throw new Error('Transaction non trouvée ou déjà traitée');
    const wallet = await getOrCreateWallet(tx.user_id);
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: tx.amount },
          available_balance: { increment: tx.amount },
        },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'completed' },
      }),
    ]);
    const newBalance = (wallet.available_balance ?? wallet.balance ?? 0) + tx.amount;
    logger.info('Wallet recharge confirmed', { userId: tx.user_id, amount: tx.amount });
    return { success: true, new_balance: newBalance };
  }

  /** CDC: Export données créateur (CSV/Excel) */
  async exportCreatorAnalytics(userId: string, format: 'csv' | 'json' = 'csv') {
    const streams = await prisma.liveStream.findMany({
      where: { creator_id: userId },
      include: { analytics: true },
      orderBy: { started_at: 'desc' },
    });
    if (format === 'json') return { streams };
    const headers = 'id,title,started_at,duration_minutes,viewers_count,peak_viewers,total_gifts_amount,total_tips_amount,total_likes,total_messages\n';
    const rows = streams.map((s) =>
      [s.id, `"${(s.title || '').replace(/"/g, '""')}"`, s.started_at?.toISOString(), s.duration_minutes ?? 0, s.viewers_count, s.peak_viewers, s.total_gifts_amount, s.total_tips_amount ?? 0, s.total_likes, s.total_messages].join(',')
    );
    return headers + rows.join('\n');
  }

  /** CDC: Chapitres replay */
  async getReplayChapters(streamId: string) {
    const chapters = await prisma.liveReplayChapter.findMany({
      where: { live_id: streamId },
      orderBy: { start_seconds: 'asc' },
    });
    return chapters;
  }

  async addReplayChapter(streamId: string, userId: string, data: { title: string; start_seconds: number; end_seconds?: number }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    return prisma.liveReplayChapter.create({
      data: { live_id: streamId, title: data.title, start_seconds: data.start_seconds, end_seconds: data.end_seconds ?? null },
    });
  }

  /**
   * Publie un chapitre replay comme vidéo VOD dans le feed : même `replay_url` + `trim_start_sec` / `trim_end_sec`.
   * Le client (Expo) boucle la lecture sur la fenêtre ; pas de transcodage serveur.
   */
  async republishReplayChapterToFeed(liveId: string, chapterId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    const chapter = await prisma.liveReplayChapter.findFirst({
      where: { id: chapterId, live_id: liveId },
    });
    if (!chapter) throw new Error('Chapter not found');
    const replayUrl = (stream.replay_url || '').trim();
    if (!replayUrl) throw new Error('Replay not ready');

    const start = Math.max(0, Math.floor(chapter.start_seconds));
    let end = chapter.end_seconds != null ? Math.floor(chapter.end_seconds) : null;
    const durationSec =
      stream.duration_minutes != null && stream.duration_minutes > 0
        ? Math.round(stream.duration_minutes * 60)
        : null;
    if (end == null && durationSec != null && durationSec > start) {
      end = durationSec;
    }
    if (end == null) {
      throw new Error('End time required: set end_seconds on the chapter or ensure live duration is set');
    }
    if (end <= start) {
      throw new Error('Invalid clip window');
    }
    const clipDuration = end - start;
    const titleBase = (chapter.title || 'Moment fort').slice(0, 200);
    const streamTitle = (stream.title || 'Live').slice(0, 180);

    const video = await prisma.video.create({
      data: {
        title: titleBase,
        description: `Extrait du live « ${streamTitle} »`,
        video_url: replayUrl,
        thumbnail_url: stream.thumbnail_url || undefined,
        creator_id: userId,
        visibility: 'public',
        trim_start_sec: start,
        trim_end_sec: end,
        duration: clipDuration,
        hashtags: ['#AfriWonder', '#Live', '#Replay'],
        editor_metadata: JSON.stringify({
          source: 'live_highlight',
          live_id: liveId,
          chapter_id: chapterId,
        }),
      },
    });
    return video;
  }

  /** CDC: Abonnement mensuel créateur (don récurrent) */
  async subscribeToCreator(subscriberId: string, creatorId: string, amountFcfa: number) {
    if (amountFcfa < 100 || amountFcfa > 100_000) throw new Error('Montant abonnement: 100 à 100 000 FCFA/mois');
    const exists = await prisma.liveCreatorSubscription.findUnique({
      where: { creator_id_subscriber_id: { creator_id: creatorId, subscriber_id: subscriberId } },
    });
    if (exists) throw new Error('Abonnement déjà actif');
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return prisma.liveCreatorSubscription.create({
      data: {
        creator_id: creatorId,
        subscriber_id: subscriberId,
        amount_fcfa: amountFcfa,
        next_billing_at: next,
      },
    });
  }

  async unsubscribeFromCreator(subscriberId: string, creatorId: string) {
    await prisma.liveCreatorSubscription.updateMany({
      where: { creator_id: creatorId, subscriber_id: subscriberId },
      data: { status: 'cancelled' },
    });
    return { ok: true };
  }

  async getCreatorSubscribeStatus(subscriberId: string, creatorId: string) {
    const row = await prisma.liveCreatorSubscription.findUnique({
      where: { creator_id_subscriber_id: { creator_id: creatorId, subscriber_id: subscriberId } },
      select: { status: true, amount_fcfa: true, next_billing_at: true },
    });
    return getCreatorSubscribeStatusPure(row);
  }

  /** Créer un sondage pendant le live */
  async createPoll(streamId: string, creatorId: string, data: { question: string; options: Array<{ text: string; votes?: number }> }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream must be live');
    
    const options = data.options.map(opt => ({ text: opt.text, votes: opt.votes || 0 }));
    const poll = await prisma.livePoll.create({
      data: {
        live_id: streamId,
        creator_id: creatorId,
        question: data.question,
        options: options as any,
        total_votes: 0,
        status: 'active',
      },
    });
    
    // Le créateur n'a pas encore voté, donc userVote = null
    const pollWithVote = {
      ...poll,
      userVote: null,
    };
    
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:poll:created', pollWithVote);
    
    return poll;
  }

  /** Voter pour un sondage */
  async votePoll(streamId: string, pollId: string, userId: string, optionIndex: number) {
    const poll = await prisma.livePoll.findUnique({ where: { id: pollId } });
    if (!poll || poll.live_id !== streamId || poll.status !== 'active') throw new Error('Poll not found or inactive');
    
    const options = poll.options as Array<{ text: string; votes: number }>;
    if (optionIndex < 0 || optionIndex >= options.length) throw new Error('Invalid option index');
    
    // Vérifier si l'utilisateur a déjà voté
    const existingVote = await prisma.livePollVote.findUnique({
      where: { poll_id_user_id: { poll_id: pollId, user_id: userId } },
    });
    
    if (existingVote) {
      // Mettre à jour le vote existant
      const oldIndex = existingVote.option_index;
      options[oldIndex].votes = Math.max(0, options[oldIndex].votes - 1);
      options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
      
      await prisma.livePollVote.update({
        where: { id: existingVote.id },
        data: { option_index: optionIndex },
      });
    } else {
      // Nouveau vote
      options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
      await prisma.livePollVote.create({
        data: {
          poll_id: pollId,
          live_id: streamId,
          user_id: userId,
          option_index: optionIndex,
        },
      });
    }
    
    const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    const updatedPoll = await prisma.livePoll.update({
      where: { id: pollId },
      data: {
        options: options as any,
        total_votes: totalVotes,
      },
    });
    
    // Récupérer le vote de l'utilisateur pour l'inclure dans l'événement
    const userVote = await prisma.livePollVote.findUnique({
      where: { poll_id_user_id: { poll_id: pollId, user_id: userId } },
      select: { option_index: true },
    });
    
    const pollWithVote = {
      ...updatedPoll,
      userVote: userVote?.option_index ?? null,
    };
    
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:poll:updated', pollWithVote);
    
    return updatedPoll;
  }

  /** Récupérer les sondages actifs d'un live avec les votes de l'utilisateur si connecté */
  async getPolls(streamId: string, userId: string | null = null) {
    const polls = await prisma.livePoll.findMany({
      where: { live_id: streamId, status: 'active' },
      orderBy: { created_at: 'desc' },
    });

    // Si un utilisateur est connecté, récupérer ses votes pour chaque poll
    if (userId) {
      const pollIds = polls.map(p => p.id);
      const userVotes = await prisma.livePollVote.findMany({
        where: {
          poll_id: { in: pollIds },
          user_id: userId,
        },
        select: {
          poll_id: true,
          option_index: true,
        },
      });

      const voteMap = new Map(userVotes.map(v => [v.poll_id, v.option_index]));

      // Ajouter le vote de l'utilisateur à chaque poll
      return polls.map(poll => ({
        ...poll,
        userVote: voteMap.get(poll.id) ?? null,
      }));
    }

    return polls;
  }

  /** Récupérer le vote d'un utilisateur pour un poll spécifique */
  async getUserPollVote(streamId: string, pollId: string, userId: string) {
    const poll = await prisma.livePoll.findUnique({ where: { id: pollId } });
    if (!poll || poll.live_id !== streamId) throw new Error('Poll not found');

    const vote = await prisma.livePollVote.findUnique({
      where: {
        poll_id_user_id: { poll_id: pollId, user_id: userId },
      },
      select: {
        option_index: true,
        created_at: true,
      },
    });

    return vote ? { optionIndex: vote.option_index, votedAt: vote.created_at } : null;
  }

  /** Terminer un sondage */
  async endPoll(streamId: string, pollId: string, creatorId: string) {
    const poll = await prisma.livePoll.findUnique({ where: { id: pollId } });
    if (!poll || poll.live_id !== streamId || poll.creator_id !== creatorId) throw new Error('Unauthorized');
    
    const endedPoll = await prisma.livePoll.update({
      where: { id: pollId },
      data: {
        status: 'ended',
        ended_at: new Date(),
      },
    });
    
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:poll:ended', endedPoll);
    
    return endedPoll;
  }

  /** Inviter un co-host (max 5 invitations actives : pending + accepted) */
  async inviteCoHost(streamId: string, creatorId: string, cohostId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream must be live');
    if (cohostId === creatorId) throw new Error('Cannot invite yourself');

    const existing = await prisma.liveCoHost.findUnique({
      where: { live_id_cohost_id: { live_id: streamId, cohost_id: cohostId } },
    });

    if (existing && existing.status === 'pending') throw new Error('Invitation already pending');
    if (existing && existing.status === 'accepted') throw new Error('User is already a co-host');

    const activeCohostSlots = await prisma.liveCoHost.count({
      where: { live_id: streamId, status: { in: ['pending', 'accepted'] } },
    });
    if (activeCohostSlots >= 5) {
      throw new Error('Maximum 5 co-hosts (invitations en attente + acceptées).');
    }
    
    const invite = await prisma.liveCoHost.upsert({
      where: { live_id_cohost_id: { live_id: streamId, cohost_id: cohostId } },
      update: { status: 'pending', invited_at: new Date() },
      create: {
        live_id: streamId,
        creator_id: creatorId,
        cohost_id: cohostId,
        status: 'pending',
      },
    });
    
    // Notification au co-host invité
    try {
      await notificationService.create(cohostId, {
        type: 'live_cohost_invite',
        title: 'Invitation co-host',
        message: `${stream.creator_name} vous invite à rejoindre son live : ${stream.title}`,
        reference_type: 'live',
        reference_id: streamId,
      });
    } catch (_) {}
    
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:cohost:invited', invite);
    
    return invite;
  }

  /** Accepter une invitation co-host */
  async acceptCoHostInvite(streamId: string, userId: string) {
    const invite = await prisma.liveCoHost.findUnique({
      where: { live_id_cohost_id: { live_id: streamId, cohost_id: userId } },
    });
    
    if (!invite || invite.status !== 'pending') throw new Error('Invitation not found or already processed');
    
    const accepted = await prisma.liveCoHost.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        accepted_at: new Date(),
      },
    });
    
    const io = getIO();
    if (io) {
      io.to(`stream:${streamId}`).emit('live:cohost:accepted', {
        ...accepted,
        rtcHint: 'GET /api/live/:id/token?role=host',
      });
    }
    
    return accepted;
  }

  /** Supprime tous les lives au statut `ended` pour ce créateur (nettoyage des replays). */
  async deleteMyEndedStreams(userId: string) {
    const r = await prisma.liveStream.deleteMany({
      where: { creator_id: userId, status: 'ended' },
    });
    return { deleted: r.count };
  }

  /** Admin : supprime tous les lives terminés (ex. nettoyage base de dev). */
  async deleteAllEndedStreamsAdmin() {
    const r = await prisma.liveStream.deleteMany({
      where: { status: 'ended' },
    });
    return { deleted: r.count };
  }

  getBroadcastTimer(streamId: string) {
    return liveBroadcastTimers.get(streamId) ?? null;
  }

  async setBroadcastTimer(streamId: string, userId: string, body: { end_at_ms: number; label: string }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    if (stream.status !== 'live') throw new Error('Stream must be live');
    const endAt = Number(body.end_at_ms);
    if (!Number.isFinite(endAt) || endAt < Date.now() + 5000) {
      throw new Error('end_at_ms doit être au moins 5 secondes dans le futur');
    }
    const label = String(body.label || 'Événement').slice(0, 120);
    liveBroadcastTimers.set(streamId, { end_at_ms: endAt, label });
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:timer', { end_at_ms: endAt, label });
    return { end_at_ms: endAt, label };
  }

  async clearBroadcastTimer(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { creator_id: true },
    });
    if (!stream || stream.creator_id !== userId) throw new Error('Unauthorized');
    liveBroadcastTimers.delete(streamId);
    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:timer', null);
    return { cleared: true };
  }

  /**
   * D — Publication replay complet comme vidéo feed (désactivable : LIVE_AUTO_PUBLISH_REPLAY_TO_FEED=0).
   * Pas de transcodage : même URL replay + durée ; le client peut trim si besoin.
   */
  /**
   * CDC 6.5 — Publie le replay intégral comme `Video` feed si `replay_url` est défini.
   * `LIVE_AUTO_PUBLISH_REPLAY_TO_FEED` : désactiver explicitement avec `0`, `false` ou `no`.
   * Toute autre valeur (y compris variable absente) = publication auto (dédoublonnage via `editor_metadata`).
   */
  async maybeAutoPublishReplayToFeedVideo(opts: {
    liveId: string;
    creatorId: string;
    title: string;
    thumbnail_url: string | null;
    replayUrl: string | null;
    durationMinutes: number;
  }) {
    const off = String(process.env.LIVE_AUTO_PUBLISH_REPLAY_TO_FEED || '').toLowerCase();
    if (off === '0' || off === 'false' || off === 'no') return null;
    const replayUrl = (opts.replayUrl || '').trim();
    if (!replayUrl) return null;
    const marker = `"live_replay_auto_id":"${opts.liveId}"`;
    const dup = await prisma.video.findFirst({
      where: {
        creator_id: opts.creatorId,
        editor_metadata: { contains: marker },
      },
      select: { id: true },
    });
    if (dup) return dup;

    const durationSec = Math.max(1, Math.round((opts.durationMinutes || 1) * 60));
    const titleBase = (opts.title || 'Live').slice(0, 200);
    const video = await prisma.video.create({
      data: {
        title: `Replay · ${titleBase}`,
        description: `Rediffusion du live (replay intégral).`,
        video_url: replayUrl,
        thumbnail_url: opts.thumbnail_url || undefined,
        creator_id: opts.creatorId,
        visibility: 'public',
        duration: durationSec,
        hashtags: ['#AfriWonder', '#Live', '#Replay'],
        editor_metadata: JSON.stringify({
          source: 'live_replay_auto',
          live_id: opts.liveId,
          live_replay_auto_id: opts.liveId,
        }),
      },
    });
    logger.info('Replay auto publié comme vidéo feed', { liveId: opts.liveId, videoId: video.id });
    return video;
  }

  /** Retirer un co-host */
  async removeCoHost(streamId: string, creatorId: string, cohostId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    
    const cohost = await prisma.liveCoHost.findUnique({
      where: { live_id_cohost_id: { live_id: streamId, cohost_id: cohostId } },
    });
    
    if (!cohost) throw new Error('Co-host not found');
    
    await prisma.liveCoHost.update({
      where: { id: cohost.id },
      data: {
        status: 'removed',
        removed_at: new Date(),
      },
    });
    
    const io = getIO();
    if (io) {
      io.to(`stream:${streamId}`).emit('live:cohost:removed', { cohostId, leaveRtc: true });
    }
    
    return { ok: true };
  }

}

export default new LiveService();
export { getIO, syncViewersCount };
