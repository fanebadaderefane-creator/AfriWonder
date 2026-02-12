import crypto from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';

let messageIo: import('socket.io').Server | null = null;
export function setMessageIo(io: import('socket.io').Server) {
  messageIo = io;
}

const DEFAULT_PAGE_SIZE = 20;
const MESSAGES_PAGE_SIZE = 30;

type UnreadCountMap = Record<string, number>;

function getUnreadForUser(map: UnreadCountMap | null, userId: string): number {
  if (!map || typeof map !== 'object') return 0;
  const n = map[userId];
  return typeof n === 'number' && n > 0 ? n : 0;
}

function setUnreadForUser(map: UnreadCountMap | null, userId: string, count: number): UnreadCountMap {
  const out = map && typeof map === 'object' ? { ...map } : {};
  if (count <= 0) delete out[userId];
  else out[userId] = count;
  return out;
}

function incrementUnreadForUser(map: UnreadCountMap | null, userId: string): UnreadCountMap {
  const out = map && typeof map === 'object' ? { ...map } : {};
  out[userId] = (out[userId] ?? 0) + 1;
  return out;
}

function makeHttpError(message: string, statusCode: number): Error & { statusCode?: number } {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function maskSensitiveContacts(input: string): string {
  if (!input) return input;
  let out = input;

  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact masque]');
  out = out.replace(/(?<!\w)(\+?\d[\d\s().-]{6,}\d)(?!\w)/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return '[contact masque]';
    return match;
  });

  return out;
}

class MessageService {
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blocker_id: blockerId, blocked_id: blockedId },
          { blocker_id: blockedId, blocked_id: blockerId },
        ],
      },
    });
    return !!block;
  }

  async getConversations(userId: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * limit;
    const take = Math.min(50, Math.max(1, limit));

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
        },
        include: {
          user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
          user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
        skip,
        take,
        orderBy: { last_message_at: 'desc' },
      }),
      prisma.conversation.count({
        where: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
        },
      }),
    ]);

    const list = conversations.map((c) => {
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const unread = getUnreadForUser(c.unread_count_map as UnreadCountMap | null, userId);
      return {
        id: c.id,
        last_message_id: c.last_message_id,
        last_message_text: c.last_message_text,
        last_message_at: c.last_message_at,
        unread_count: unread,
        is_group: c.is_group,
        group_name: c.group_name,
        group_avatar: c.group_avatar,
        other,
        user1: c.user1,
        user2: c.user2,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    });

    return {
      conversations: list,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getOrCreateConversation(user1Id: string, user2Id: string) {
    const blocked = await this.isBlocked(user1Id, user2Id);
    if (blocked) throw new Error('Cannot start conversation with this user');

    const [id1, id2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    let conversation = await prisma.conversation.findFirst({
      where: { user1_id: id1, user2_id: id2 },
      include: {
        user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
        user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { user1_id: id1, user2_id: id2 },
        include: {
          user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
          user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
      });
    }

    return conversation;
  }

  async getMessages(conversationId: string, cursor?: string | null, limit: number = MESSAGES_PAGE_SIZE, userId: string | null = null) {
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ...(userId ? { OR: [{ user1_id: userId }, { user2_id: userId }] } : {}),
      },
      select: { id: true },
    });
    if (!conv) throw new Error('Conversation non trouvee ou acces non autorise');

    const take = Math.min(50, Math.max(1, limit)) + 1;

    const where: { conversation_id: string; is_deleted: boolean; created_at?: { lt: Date } } = {
      conversation_id: conversationId,
      is_deleted: false,
    };
    if (cursor) where.created_at = { lt: new Date(cursor) };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
    });

    const hasMore = messages.length > limit;
    const list = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && list.length ? list[list.length - 1].created_at.toISOString() : null;

    return {
      messages: list.reverse(),
      nextCursor,
      hasMore,
    };
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    type: string = 'text',
    options?: { media_url?: string; thumbnail_url?: string; reply_to_message_id?: string }
  ) {
    const blocked = await this.isBlocked(senderId, recipientId);
    if (blocked) throw new Error('Cannot send message to this user');

    const normalizedType = String(type || 'text').trim().toLowerCase();
    const allowedTypes = new Set(['text', 'image', 'video', 'audio', 'file']);
    if (!allowedTypes.has(normalizedType)) {
      throw makeHttpError('Type de message invalide', 400);
    }

    const rawContent = typeof content === 'string' ? content : '';
    const maskedContent = maskSensitiveContacts(rawContent.trim()).slice(0, 2000);
    const mediaUrl = options?.media_url ? String(options.media_url).trim() : '';
    const thumbnailUrl = options?.thumbnail_url ? String(options.thumbnail_url).trim() : '';

    if (normalizedType === 'text' && !maskedContent) {
      throw makeHttpError('Le contenu texte est requis', 400);
    }
    if (normalizedType !== 'text' && !mediaUrl) {
      throw makeHttpError('media_url est requis pour ce type de message', 400);
    }

    const conversation = await this.getOrCreateConversation(senderId, recipientId);
    const otherId = conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id;

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        content: maskedContent,
        type: normalizedType,
        status: 'sent',
        media_url: mediaUrl || null,
        thumbnail_url: thumbnailUrl || null,
        reply_to_message_id: options?.reply_to_message_id || null,
      },
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
      },
    });

    const prevMap = (conversation.unread_count_map as UnreadCountMap) || {};
    const newMap = incrementUnreadForUser(prevMap, otherId);

    const lastText = normalizedType === 'text'
      ? maskedContent
      : normalizedType === 'image'
        ? 'Image'
        : normalizedType === 'video'
          ? 'Video'
          : normalizedType === 'audio'
            ? 'Audio'
            : 'Fichier';

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message_id: message.id,
        last_message_text: lastText.slice(0, 200),
        last_message_at: new Date(),
        unread_count_map: newMap,
      },
    });

    if (messageIo) {
      messageIo.to(`conversation:${conversation.id}`).emit('message:new', message);
      messageIo.to(`user:${otherId}`).emit('message:unread', { conversationId: conversation.id, unread: getUnreadForUser(newMap, otherId) });
    }

    try {
      await notificationService.create(otherId, {
        type: 'message_new',
        title: 'Nouveau message',
        message: normalizedType === 'text' ? (maskedContent.slice(0, 120) || 'Message recu') : `Nouveau ${normalizedType}`,
        reference_type: 'conversation',
        reference_id: conversation.id,
        data: { conversationId: conversation.id, senderId },
      });
    } catch (err) {
      logger.warn('Message notification failed', { senderId, recipientId, err });
    }

    logger.info('Message sent', { senderId, recipientId, messageId: message.id });
    return message;
  }

  async sendOrderTrackingUpdate(orderId: string, status: string, actorId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, user_id: true, seller_id: true },
    });
    if (!order?.seller_id) return null;

    const participants = new Set([order.user_id, order.seller_id]);
    if (!participants.has(actorId)) return null;

    const recipientId = actorId === order.user_id ? order.seller_id : order.user_id;
    const shortId = order.id.slice(0, 8);
    const frMap: Record<string, string> = {
      processing: 'en traitement',
      preparing: 'en preparation',
      in_transit: 'en livraison',
      delivered: 'livree',
      completed: 'terminee',
      cancelled: 'annulee',
      paid: 'payee',
    };
    const bmMap: Record<string, string> = {
      processing: 'baara kan',
      preparing: 'sigida la',
      in_transit: 'sira kan',
      delivered: 'seginna',
      completed: 'banbana',
      cancelled: 'dabila',
      paid: 'warakeli kera',
    };
    const fr = frMap[status] || status;
    const bm = bmMap[status] || status;
    const text = `Suivi commande #${shortId}: statut ${fr}. [BM: ${bm}]`;

    try {
      return await this.sendMessage(actorId, recipientId, text, 'text');
    } catch (err) {
      logger.warn('Order tracking auto-message failed', { orderId, status, actorId, err });
      return null;
    }
  }

  async markAsRead(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
    });
    if (!conv) return { success: false };

    const newMap = setUnreadForUser(conv.unread_count_map as UnreadCountMap | null, userId, 0);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unread_count_map: newMap },
    });

    await prisma.message.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        status: { not: 'read' },
      },
      data: { status: 'read' },
    });

    if (messageIo) {
      messageIo.to(`conversation:${conversationId}`).emit('message:read', { conversationId, userId });
    }

    logger.info('Messages marked as read', { conversationId, userId });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { unread_count_map: true },
    });
    let count = 0;
    for (const c of conversations) {
      count += getUnreadForUser(c.unread_count_map as UnreadCountMap | null, userId);
    }
    return { count };
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.message.findFirst({ where: { id: messageId } });
    if (!msg || msg.sender_id !== userId) throw new Error('Message not found or not yours');
    await prisma.message.update({
      where: { id: messageId },
      data: { is_deleted: true, content: '', media_url: null },
    });
    if (messageIo) messageIo.to(`conversation:${msg.conversation_id}`).emit('message:deleted', { messageId });
    return { success: true };
  }

  async blockUser(blockerId: string, blockedId: string) {
    await prisma.userBlock.upsert({
      where: {
        blocker_id_blocked_id: { blocker_id: blockerId, blocked_id: blockedId },
      },
      create: { id: crypto.randomUUID(), blocker_id: blockerId, blocked_id: blockedId },
      update: {},
    });
    return { success: true };
  }

  async reportMessage(reporterId: string, messageId: string, reason?: string) {
    await prisma.messageReport.create({
      data: {
        id: crypto.randomUUID(),
        reporter_id: reporterId,
        message_id: messageId,
        reason: reason ?? null,
      },
    });
    return { success: true };
  }

  async getPresence(userId: string) {
    const p = await prisma.userPresence.findUnique({
      where: { user_id: userId },
      select: { is_online: true, last_seen: true },
    });
    return { is_online: p?.is_online ?? false, last_seen: p?.last_seen ?? null };
  }

  async setPresenceOnline(userId: string) {
    await prisma.userPresence.upsert({
      where: { user_id: userId },
      create: { id: crypto.randomUUID(), user_id: userId, is_online: true },
      update: { is_online: true },
    });
  }

  async setPresenceOffline(userId: string) {
    await prisma.userPresence.updateMany({
      where: { user_id: userId },
      data: { is_online: false },
    });
  }
}

export default new MessageService();
