import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';

let messageIo: import('socket.io').Server | null = null;
export function setMessageIo(io: import('socket.io').Server) {
  messageIo = io;
}

const DEFAULT_PAGE_SIZE = 20;
const MESSAGES_PAGE_SIZE = 30;

/** Exclure les comptes supprimés (anonymisés) des listes. */
const NOT_DELETED_USER = {
  NOT: {
    OR: [
      { username: { startsWith: 'deleted_' } },
      { email: { contains: '@deleted.local' } },
    ],
  },
};

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
  private async getMessageForParticipant(messageId: string, userId: string) {
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
        },
      },
      select: {
        id: true,
        sender_id: true,
        conversation_id: true,
        is_pinned: true,
        is_important: true,
        reactions: true,
      },
    });
    if (!message) throw makeHttpError('Message non trouve ou acces non autorise', 404);
    return message;
  }

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

  async getConversations(userId: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE, includeArchived: boolean = false) {
    const skip = (page - 1) * limit;
    const take = Math.min(50, Math.max(1, limit));

    const baseWhere = {
      OR: [
        { user1_id: userId, user2: NOT_DELETED_USER },
        { user2_id: userId, user1: NOT_DELETED_USER },
      ] as const,
    };
    const archiveFilter = includeArchived
      ? null
      : {
          OR: [
            { user1_id: userId, is_archived_user1: false },
            { user2_id: userId, is_archived_user2: false },
          ],
        };
    const where = archiveFilter
      ? { AND: [{ OR: [...baseWhere.OR] }, archiveFilter] }
      : { OR: [...baseWhere.OR] };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
          user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
        skip,
        take,
        orderBy: { last_message_at: 'desc' },
      }),
      prisma.conversation.count({ where }),
    ]);

    const list = conversations.map((c) => {
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const unread = getUnreadForUser(c.unread_count_map as UnreadCountMap | null, userId);
      const is_archived = c.user1_id === userId ? c.is_archived_user1 : c.is_archived_user2;
      const draft_content = (c.draft_content as Record<string, string> | null)?.[userId] ?? null;
      const muted = c.user1_id === userId ? !!c.muted_user1 : !!c.muted_user2;
      return {
        id: c.id,
        last_message_id: c.last_message_id,
        last_message_text: c.last_message_text,
        last_message_at: c.last_message_at,
        unread_count: unread,
        is_group: c.is_group,
        group_name: c.group_name,
        group_avatar: c.group_avatar,
        is_archived,
        draft_content,
        muted,
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
    if (blocked) throw makeHttpError('Impossible de démarrer une conversation avec cet utilisateur', 403);

    const [id1, id2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    let conversation = await prisma.conversation.findFirst({
      where: { user1_id: id1, user2_id: id2 },
      include: {
        user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
        user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
        pinned_message: {
          select: {
            id: true,
            content: true,
            type: true,
            created_at: true,
            sender_id: true,
            deleted_for_all_at: true,
          },
        },
      },
    });

    if (!conversation) {
      const created = await prisma.conversation.create({
        data: { user1_id: id1, user2_id: id2 },
      });
      conversation = await prisma.conversation.findFirst({
        where: { id: created.id },
        include: {
          user1: { select: { id: true, username: true, full_name: true, profile_image: true } },
          user2: { select: { id: true, username: true, full_name: true, profile_image: true } },
          pinned_message: {
            select: {
              id: true,
              content: true,
              type: true,
              created_at: true,
              sender_id: true,
              deleted_for_all_at: true,
            },
          },
        },
      })!;
    }

    if ((conversation as any).pinned_message?.deleted_for_all_at) {
      (conversation as any).pinned_message.content = 'Ce message a été supprimé';
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

    const now = new Date();
    const where: Prisma.MessageWhereInput = {
      conversation_id: conversationId,
      is_deleted: false,
      OR: [
        { is_ephemeral: false },
        { is_ephemeral: true, expires_at: { gt: now } },
        { is_ephemeral: true, expires_at: null },
      ],
    };
    if (cursor) (where as Prisma.MessageWhereInput).created_at = { lt: new Date(cursor) };

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

    const DELETED_PLACEHOLDER = 'Ce message a été supprimé';
    const normalized = list.reverse().map((m) => {
      if ((m as any).deleted_for_all_at) {
        return {
          ...m,
          content: DELETED_PLACEHOLDER,
          media_url: null,
          thumbnail_url: null,
          sticker_url: null,
          location_lat: null,
          location_lng: null,
          location_label: null,
          contact_user_id: null,
          contact_name: null,
        };
      }
      return m;
    });

    return {
      messages: normalized,
      nextCursor,
      hasMore,
    };
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    type: string = 'text',
    options?: {
      media_url?: string;
      thumbnail_url?: string;
      reply_to_message_id?: string;
      is_ephemeral?: boolean;
      expires_at?: string;
      location_lat?: number;
      location_lng?: number;
      location_label?: string;
      contact_user_id?: string;
      contact_name?: string;
      sticker_url?: string;
      scheduled_at?: string;
    }
  ) {
    const blocked = await this.isBlocked(senderId, recipientId);
    if (blocked) throw makeHttpError('Impossible d\'envoyer un message à cet utilisateur', 403);

    const normalizedType = String(type || 'text').trim().toLowerCase();
    const allowedTypes = new Set(['text', 'image', 'video', 'audio', 'voice', 'file', 'sticker', 'location', 'contact']);
    if (!allowedTypes.has(normalizedType)) {
      throw makeHttpError('Type de message invalide', 400);
    }

    const rawContent = typeof content === 'string' ? content : '';
    const maskedContent = maskSensitiveContacts(rawContent.trim()).slice(0, 2000);
    const mediaUrl = options?.media_url ? String(options.media_url).trim() : '';
    const thumbnailUrl = options?.thumbnail_url ? String(options.thumbnail_url).trim() : '';
    const stickerUrl = options?.sticker_url ? String(options.sticker_url).trim() : '';

    if (normalizedType === 'text' && !maskedContent) {
      throw makeHttpError('Le contenu texte est requis', 400);
    }
    if (['image', 'video', 'audio', 'voice', 'file'].includes(normalizedType) && !mediaUrl) {
      throw makeHttpError('media_url est requis pour ce type de message', 400);
    }
    if (normalizedType === 'sticker' && !stickerUrl) {
      throw makeHttpError('sticker_url est requis pour un sticker', 400);
    }
    if (normalizedType === 'location' && (options?.location_lat == null || options?.location_lng == null)) {
      throw makeHttpError('location_lat et location_lng sont requis pour partager une localisation', 400);
    }
    if (normalizedType === 'contact' && !options?.contact_user_id && !options?.contact_name) {
      throw makeHttpError('contact_user_id ou contact_name requis pour partager un contact', 400);
    }

    const conversation = await this.getOrCreateConversation(senderId, recipientId);
    if (!conversation) throw makeHttpError('Conversation introuvable', 404);
    const otherId = conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id;

    const isEphemeral = Boolean(options?.is_ephemeral);
    const expiresAt = options?.expires_at ? new Date(options.expires_at) : (isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null);
    const scheduledAt = options?.scheduled_at ? new Date(options.scheduled_at) : null;
    const isScheduled = scheduledAt != null && scheduledAt.getTime() > Date.now();

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        content: normalizedType === 'location' ? (options?.location_label || `${options?.location_lat},${options?.location_lng}`) : maskedContent,
        type: normalizedType,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduled_at: scheduledAt,
        media_url: mediaUrl || null,
        thumbnail_url: thumbnailUrl || null,
        reply_to_message_id: options?.reply_to_message_id || null,
        is_ephemeral: isEphemeral,
        expires_at: expiresAt,
        location_lat: options?.location_lat ?? null,
        location_lng: options?.location_lng ?? null,
        location_label: options?.location_label ?? null,
        contact_user_id: options?.contact_user_id ?? null,
        contact_name: options?.contact_name ?? null,
        sticker_url: stickerUrl || null,
      },
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
      },
    });

    if (isScheduled) {
      logger.info('Message programmé créé', { messageId: message.id, conversationId: conversation.id, scheduled_at: scheduledAt });
      return message;
    }

    const prevMap = (conversation.unread_count_map as UnreadCountMap) || {};
    const newMap = incrementUnreadForUser(prevMap, otherId);

    const lastText = normalizedType === 'text'
      ? maskedContent
      : normalizedType === 'image'
        ? 'Image'
        : normalizedType === 'video'
          ? 'Video'
          : normalizedType === 'audio' || normalizedType === 'voice'
            ? 'Audio'
            : normalizedType === 'sticker'
              ? 'Sticker'
              : normalizedType === 'location'
                ? 'Position'
                : normalizedType === 'contact'
                  ? 'Contact'
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

    const recipientMuted =
      (conversation as any).muted_user2 === true && otherId === conversation.user2_id ||
      (conversation as any).muted_user1 === true && otherId === conversation.user1_id;
    if (!recipientMuted) {
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
    }

    logger.info('Message sent', { senderId, recipientId, messageId: message.id });
    return message;
  }

  /** Envoie un message programmé dont l'heure est due (appelé par le job cron). */
  async deliverScheduledMessage(messageId: string): Promise<boolean> {
    const message = await prisma.message.findFirst({
      where: { id: messageId, status: 'scheduled', scheduled_at: { not: null, lte: new Date() } },
      include: {
        conversation: true,
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
      },
    });
    if (!message) return false;

    const conv = message.conversation;
    const senderId = message.sender_id;
    const otherId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
    const lastText = message.type === 'text' ? (message.content?.slice(0, 200) || 'Message') : message.type;
    const prevMap = (conv.unread_count_map as UnreadCountMap) || {};
    const newMap = incrementUnreadForUser(prevMap, otherId);

    await prisma.$transaction([
      prisma.message.update({
        where: { id: messageId },
        data: { status: 'sent' },
      }),
      prisma.conversation.update({
        where: { id: conv.id },
        data: {
          last_message_id: message.id,
          last_message_text: lastText,
          last_message_at: new Date(),
          unread_count_map: newMap,
        },
      }),
    ]);

    if (messageIo) {
      const sentMessage = { ...message, status: 'sent' as const };
      messageIo.to(`conversation:${conv.id}`).emit('message:new', sentMessage);
      messageIo.to(`user:${otherId}`).emit('message:unread', { conversationId: conv.id, unread: getUnreadForUser(newMap, otherId) });
    }

    try {
      await notificationService.create(otherId, {
        type: 'message_new',
        title: 'Nouveau message',
        message: message.type === 'text' ? (message.content?.slice(0, 120) || 'Message reçu') : `Nouveau ${message.type}`,
        reference_type: 'conversation',
        reference_id: conv.id,
        data: { conversationId: conv.id, senderId },
      });
    } catch (err) {
      logger.warn('Scheduled message notification failed', { messageId, err });
    }

    logger.info('Message programmé envoyé', { messageId, conversationId: conv.id });
    return true;
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

  async setConversationArchived(conversationId: string, userId: string, archived: boolean) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true, user1_id: true, user2_id: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée', 404);
    const isUser1 = conv.user1_id === userId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isUser1 ? { is_archived_user1: archived } : { is_archived_user2: archived },
    });
    return { archived };
  }

  async setConversationMuted(conversationId: string, userId: string, muted: boolean) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true, user1_id: true, user2_id: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée', 404);
    const isUser1 = conv.user1_id === userId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isUser1 ? { muted_user1: muted } : { muted_user2: muted },
    });
    return { muted };
  }

  async setConversationDraft(conversationId: string, userId: string, content: string | null) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true, draft_content: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée', 404);
    const draft = (conv.draft_content as Record<string, string> | null) || {};
    if (content === null || content === '') delete draft[userId];
    else draft[userId] = content;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { draft_content: Object.keys(draft).length ? draft : Prisma.JsonNull },
    });
    return { draft_content: content || null };
  }

  async getConversationDraft(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { draft_content: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée', 404);
    const draft = (conv.draft_content as Record<string, string> | null)?.[userId] ?? null;
    return { draft_content: draft };
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

  /** CPO 4.17 — Suppression pour tous (uniquement l’expéditeur, dans les 15 min). */
  private static readonly DELETE_FOR_ALL_WINDOW_MS = 15 * 60 * 1000;

  async deleteForAll(messageId: string, userId: string) {
    const msg = await prisma.message.findFirst({
      where: { id: messageId },
      select: { id: true, sender_id: true, conversation_id: true, created_at: true },
    });
    if (!msg || msg.sender_id !== userId) throw makeHttpError('Message non trouvé ou non autorisé', 404);
    const elapsed = Date.now() - msg.created_at.getTime();
    if (elapsed > MessageService.DELETE_FOR_ALL_WINDOW_MS) {
      throw makeHttpError('La suppression pour tous n’est possible que dans les 15 minutes suivant l’envoi', 400);
    }
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deleted_for_all_at: new Date(),
        content: 'Ce message a été supprimé',
        media_url: null,
        thumbnail_url: null,
        sticker_url: null,
        location_lat: null,
        location_lng: null,
        location_label: null,
        contact_user_id: null,
        contact_name: null,
      },
    });
    if (messageIo) messageIo.to(`conversation:${msg.conversation_id}`).emit('message:deleted_for_all', { messageId });
    return { success: true };
  }

  /** CPO 4.23 — Épingler un message en tête de conversation (1-1 uniquement). */
  async pinMessage(conversationId: string, messageId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }], is_group: false },
      select: { id: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée ou non autorisée', 404);
    const msg = await prisma.message.findFirst({
      where: { id: messageId, conversation_id: conversationId },
    });
    if (!msg) throw makeHttpError('Message non trouvé dans cette conversation', 404);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned_message_id: messageId },
    });
    if (messageIo) messageIo.to(`conversation:${conversationId}`).emit('message:pinned', { messageId });
    return { success: true, pinned_message_id: messageId };
  }

  /** CPO 4.23 — Désépingler le message de la conversation. */
  async unpinMessage(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée ou non autorisée', 404);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned_message_id: null },
    });
    if (messageIo) messageIo.to(`conversation:${conversationId}`).emit('message:unpinned', {});
    return { success: true };
  }

  async updateMessageMeta(messageId: string, userId: string, data: { is_pinned?: boolean; is_important?: boolean }) {
    const msg = await this.getMessageForParticipant(messageId, userId);
    const updateData: { is_pinned?: boolean; is_important?: boolean } = {};
    if (typeof data.is_pinned === 'boolean') updateData.is_pinned = data.is_pinned;
    if (typeof data.is_important === 'boolean') updateData.is_important = data.is_important;
    if (Object.keys(updateData).length === 0) throw makeHttpError('Aucune meta a mettre a jour', 400);

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    if (messageIo) {
      messageIo.to(`conversation:${msg.conversation_id}`).emit('message:updated', {
        messageId,
        ...updateData,
      });
    }
    return updated;
  }

  async setMessageReaction(messageId: string, userId: string, emoji: string | null) {
    const msg = await this.getMessageForParticipant(messageId, userId);
    const prev = (msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {}) as Record<string, string>;
    const next = { ...prev };

    if (emoji && String(emoji).trim()) {
      next[userId] = String(emoji).trim().slice(0, 8);
    } else {
      delete next[userId];
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: Object.keys(next).length ? next : Prisma.JsonNull },
    });

    if (messageIo) {
      messageIo.to(`conversation:${msg.conversation_id}`).emit('message:updated', {
        messageId,
        reactions: updated.reactions,
      });
    }
    return updated;
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

  /** Export des conversations de l'utilisateur (sauvegarde cloud) — exclut messages éphémères expirés. */
  async exportConversations(userId: string): Promise<{ conversations: Array<{ conversationId: string; otherUser: { id: string; username: string; full_name: string | null }; messages: Array<Record<string, unknown>> }> }> {
    const convs = await prisma.conversation.findMany({
      where: {
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
      include: {
        user1: { select: { id: true, username: true, full_name: true } },
        user2: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { last_message_at: 'desc' },
    });
    const now = new Date();
    const result: Array<{ conversationId: string; otherUser: { id: string; username: string; full_name: string | null }; messages: Array<Record<string, unknown>> }> = [];
    for (const c of convs) {
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const messages = await prisma.message.findMany({
        where: {
          conversation_id: c.id,
          is_deleted: false,
          OR: [
            { is_ephemeral: false },
            { is_ephemeral: true, expires_at: { gt: now } },
            { is_ephemeral: true, expires_at: null },
          ],
        },
        include: { sender: { select: { id: true, username: true, full_name: true } } },
        orderBy: { created_at: 'asc' },
      });
      result.push({
        conversationId: c.id,
        otherUser: { id: other.id, username: other.username, full_name: other.full_name },
        messages: messages.map((m) => ({
          id: m.id,
          sender_id: m.sender_id,
          sender: m.sender,
          content: m.content,
          type: m.type,
          media_url: m.media_url,
          created_at: m.created_at.toISOString(),
        })),
      });
    }
    return { conversations: result };
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
