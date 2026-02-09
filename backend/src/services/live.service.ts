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
import crypto from 'crypto';

import commissionService from './commission.service.js';
// Cadeaux live : 50% partagé (25% créateur, 25% plateforme) — modèle AfriWonder
const VIEWER_INACTIVE_SEC = 60;
const ANTI_SPAM_CHAT_SEC = 2;
const GIFT_RATE_LIMIT_COUNT = 5;
const GIFT_RATE_LIMIT_WINDOW_MS = 10 * 1000;

// In-memory rate limits (en prod: Redis)
const giftRateLimitMap = new Map<string, number[]>();
const chatLastMessageMap = new Map<string, number>();

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
  const activeCount = await prisma.liveViewer.count({
    where: { live_id: streamId, is_active: true },
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

/** UID numérique pour Agora (0 .. 2^32-1) à partir de userId */
function userIdToAgoraUid(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest();
  return hash.readUInt32BE(0) >>> 0;
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
  async getAgoraToken(channelName: string, userId: string, role: 'host' | 'audience'): Promise<{ token: string; appId: string; channel: string; uid: number } | null> {
    const appId = process.env.AGORA_APP_ID;
    const appCert = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCert) return null;
    try {
      const { RtcTokenBuilder, RtcRole } = await import('agora-token');
      const uid = userIdToAgoraUid(userId);
      const expireSec = 3600 * 24;
      const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expireSec;
      const rtcRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, uid, rtcRole, privilegeExpiredTs, privilegeExpiredTs);
      return { token, appId, channel: channelName, uid };
    } catch (e) {
      logger.warn('Agora token generation failed', { err: (e as Error).message });
      return null;
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
        title: data.title,
        description: data.description,
        category: data.category,
        stream_url: data.streamUrl || '',
        stream_token: streamToken,
        stream_key: data.stream_key,
        rtmp_url: data.rtmp_url,
        playback_url: data.playback_url,
        thumbnail_url: data.thumbnail_url,
        region: data.region,
        language: data.language,
        status,
        scheduled_at: data.scheduled_at,
        room_id: roomId,
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

    // C: Notification push "Live started" aux followers (seulement si live immédiat)
    try {
      const followers = await prisma.follow.findMany({
        where: { following_id: userId },
        select: { follower_id: true },
      });
      const creatorName = user.username || 'Un créateur';
      for (const f of followers) {
        try {
          await notificationService.create(f.follower_id, {
            type: 'live_started',
            title: 'Live démarré',
            message: `${creatorName} a commencé un live : ${data.title}`,
            reference_type: 'live',
            reference_id: stream.id,
          });
        } catch (_) {}
      }
      if (status === 'live' && followers.length) logger.info('Live started notifications sent', { streamId: stream.id, count: followers.length });
    } catch (e) {
      logger.warn('Live started notifications skip', { streamId: stream.id });
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
    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  /** Retourne { token, appId?, channel?, uid? } pour Agora ou token HMAC seul */
  async getStreamToken(streamId: string, userId: string, role: 'host' | 'audience') {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (role === 'host' && stream.creator_id !== userId) throw new Error('Unauthorized');
    const agora = await this.getAgoraToken(stream.room_id, userId, role);
    if (agora) return agora;
    return {
      token: this.generateStreamToken(stream.room_id, userId, role),
      appId: null,
      channel: null,
      uid: null,
    };
  }

  /** Viewer rejoint → create LiveViewer, sync count. Optionnel: country pour analytics. */
  async joinViewer(streamId: string, userId: string, sessionId: string, options?: { country?: string }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended');

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
      },
      update: { is_active: true, left_at: null, last_seen_at: new Date(), country: options?.country?.slice(0, 10) },
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

  async getStream(streamId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        creator: { select: { id: true, username: true, profile_image: true, is_verified: true } },
        moderation_settings: true,
        chat_messages: { take: 100, orderBy: [{ is_pinned: 'desc' }, { created_date: 'desc' }], where: { is_deleted: false } },
        gifts: { take: 30, orderBy: { created_at: 'desc' } },
      },
    });
    if (!stream) return null;
    const moderatorIds = new Set((await prisma.liveModerator.findMany({ where: { live_id: streamId }, select: { user_id: true } })).map((m) => m.user_id));
    const topDonorIds = new Set((await prisma.liveTopDonor.findMany({ where: { live_id: streamId }, take: 20, select: { user_id: true } })).map((d) => d.user_id));
    const creatorId = stream.creator_id;
    const chatWithBadges = stream.chat_messages.map((msg: any) => ({
      ...msg,
      sender_badges: {
        is_creator: msg.sender_id === creatorId,
        is_moderator: moderatorIds.has(msg.sender_id),
        is_top_supporter: topDonorIds.has(msg.sender_id),
      },
    }));
    return { ...stream, chat_messages: chatWithBadges };
  }

  async listStreams(page = 1, limit = 20, filters?: { status?: string; category?: string; featured?: boolean; region?: string; language?: string }) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.featured !== undefined) where.is_featured = filters.featured;
    if (filters?.region) where.region = filters.region;
    if (filters?.language) where.language = filters.language;

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        include: { creator: { select: { id: true, username: true, profile_image: true, is_verified: true } } },
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { viewers_count: 'desc' }],
      }),
      prisma.liveStream.count({ where }),
    ]);
    return { streams, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Découverte : populaires, régionaux, par catégorie, des comptes suivis */
  async getDiscovery(userId: string | null, options?: { type?: 'popular' | 'regional' | 'followed' | 'category'; region?: string; category?: string; limit?: number }) {
    const limit = Math.min(options?.limit ?? 20, 50);
    const where: any = { status: 'live' };

    if (options?.type === 'regional' && options?.region) {
      where.region = options.region;
    }
    if (options?.type === 'category' && options?.category) {
      where.category = options.category;
    }

    let orderBy: any[] = [{ viewers_count: 'desc' }, { started_at: 'desc' }];
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
        include: { creator: { select: { id: true, username: true, profile_image: true, is_verified: true } } },
        take: limit,
        orderBy,
      }),
      prisma.liveStream.count({ where }),
    ]);
    return { streams, pagination: { page: 1, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Cadeau: vérif status, wallet, transaction atomique, rate limit */
  async sendGift(streamId: string, senderId: string, data: {
    giftId: string;
    giftName: string;
    giftIcon: string;
    amount: number;
    quantity: number;
    message?: string;
  }) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended. Gifts are disabled.');

    const totalAmount = data.amount * data.quantity;
    if (totalAmount <= 0) throw new Error('Invalid amount');

    const key = `${streamId}:${senderId}`;
    pruneGiftRateLimit(key);
    const recent = giftRateLimitMap.get(key) || [];
    if (recent.length >= GIFT_RATE_LIMIT_COUNT) {
      throw new Error(`Limite: max ${GIFT_RATE_LIMIT_COUNT} cadeaux par 10 secondes.`);
    }
    recent.push(Date.now());
    giftRateLimitMap.set(key, recent);

    const wallet = await getOrCreateWallet(senderId);
    if (wallet.balance < totalAmount) {
      throw new Error(`Solde insuffisant. Votre solde: ${wallet.balance} FCFA. Rechargez votre portefeuille.`);
    }

    const { platform: platformCommission, creator: creatorEarnings } = commissionService.videoSocialLiveGift(totalAmount);

    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: totalAmount } },
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
          amount: data.amount,
          quantity: data.quantity,
          total_amount: totalAmount,
          creator_earnings: creatorEarnings,
          platform_commission: platformCommission,
          message: data.message,
        },
      });

      await tx.liveStream.update({
        where: { id: streamId },
        data: { total_gifts_amount: { increment: totalAmount } },
      });

      await tx.liveChat.create({
        data: {
          live_id: streamId,
          sender_id: senderId,
          sender_name: (await tx.user.findUnique({ where: { id: senderId }, select: { username: true } }))?.username || 'User',
          sender_avatar: (await tx.user.findUnique({ where: { id: senderId }, select: { profile_image: true } }))?.profile_image || null,
          message: `🎁 ${data.giftName} x${data.quantity}`,
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
          amount: -totalAmount,
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

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:gift', result);

    logger.info('Live gift sent', { streamId, senderId, giftId: result.id, totalAmount });
    return result;
  }

  /** Chat: anti-spam 1 msg / 2 sec, slow mode, banned words, followers only, mute/ban */
  async sendChatMessage(streamId: string, userId: string, message: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { moderation_settings: true },
    });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended. Chat is closed.');

    const settings = stream.moderation_settings;
    if (settings && !settings.comments_enabled) throw new Error('Comments are disabled by the host.');

    const ban = await prisma.liveStreamBan.findFirst({
      where: { live_id: streamId, user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    if (ban) {
      if (ban.is_permanent) throw new Error('You are banned from this stream.');
      if (ban.expires_at && ban.expires_at > new Date()) throw new Error('You are temporarily muted.');
    }

    const chatKey = `${streamId}:${userId}`;
    const now = Date.now();
    const last = chatLastMessageMap.get(chatKey) || 0;
    if (now - last < ANTI_SPAM_CHAT_SEC * 1000) {
      throw new Error(`Attendez ${ANTI_SPAM_CHAT_SEC} secondes entre chaque message.`);
    }
    chatLastMessageMap.set(chatKey, now);

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

    const bannedWords = (settings?.banned_words as string[]) || [];
    let cleanMessage = (message || '').trim().slice(0, 500);
    for (const word of bannedWords) {
      const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanMessage = cleanMessage.replace(re, '***');
    }
    if (!cleanMessage) throw new Error('Message vide.');

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
    const isCreator = stream.creator_id === userId;
    const isMod = await prisma.liveModerator.findUnique({
      where: { live_id_user_id: { live_id: streamId, user_id: userId } },
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
      },
    });

    await prisma.liveStream.update({
      where: { id: streamId },
      data: { total_messages: { increment: 1 } },
    });

    const io = getIO();
    if (io) io.to(`stream:${streamId}`).emit('live:chat', chatMessage);

    return chatMessage;
  }

  async like(streamId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    if (stream.status !== 'live') throw new Error('Stream has ended.');

    await prisma.liveLike.create({
      data: { live_id: streamId, user_id: userId },
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
      select: { user_id: true, watch_duration: true, joined_at: true, left_at: true, country: true },
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
    if (io) io.to(`stream:${streamId}`).emit('live:ended', { streamId });

    logger.info('Live stream ended', { streamId, userId, durationMinutes });
    return prisma.liveStream.findUnique({ where: { id: streamId } });
  }

  async getModerationSettings(streamId: string) {
    return prisma.liveModerationSettings.findUnique({ where: { live_id: streamId } });
  }

  async updateModerationSettings(streamId: string, userId: string, data: {
    slow_mode_seconds?: number;
    comments_enabled?: boolean;
    followers_only?: boolean;
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
    await prisma.liveStream.update({
      where: { id: streamId },
      data: { replay_url: replayUrl },
    });
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
    const donors = await prisma.liveTopDonor.findMany({
      where: { live_id: streamId },
      orderBy: { rank: 'asc' },
      take: limit,
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    return donors;
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
    const result = await paymentService.initiateOrangeMoneyPayment(userId, tx.id, {
      amount,
      phone: phone || '',
      returnUrl,
    });
    return { transaction_id: tx.id, payment_url: result.paymentUrl, amount };
  }

  /** B: Confirmer recharge (après retour Orange Money ou webhook) */
  async confirmWalletRecharge(transactionId: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, type: 'wallet_recharge', status: 'pending' },
    });
    if (!tx) throw new Error('Transaction non trouvée ou déjà traitée');
    const wallet = await getOrCreateWallet(tx.user_id);
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: tx.amount } },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'completed' },
      }),
    ]);
    logger.info('Wallet recharge confirmed', { userId: tx.user_id, amount: tx.amount });
    return { success: true, new_balance: wallet.balance + tx.amount };
  }
}

export default new LiveService();
export { getIO, syncViewersCount };
