import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { transcribeBufferWithWhisper } from '../utils/whisperTranscription.js';
import notificationService from './notification.service.js';
import {
  GROUP_POLL_MAX_QUESTION_LEN,
  GROUP_POLL_MAX_OPTIONS,
  GROUP_POLL_MIN_OPTIONS,
  normalizePollOptions,
} from '../utils/pollMessage.js';

let messageIo: import('socket.io').Server | null = null;
export function setMessageIo(io: import('socket.io').Server) {
  messageIo = io;
}

/** Socket.io — salon messagerie groupe (`message:join-group`). */
export function emitToGroupRoom(groupId: string, event: string, payload: unknown) {
  if (messageIo) messageIo.to(`group:${groupId}`).emit(event, payload);
}

/** Socket.io — salon utilisateur (`user:join` dans index.ts). */
export function emitToUserRoom(userId: string, event: string, payload: unknown) {
  if (messageIo && userId) messageIo.to(`user:${userId}`).emit(event, payload);
}

/** Émet le même événement à plusieurs utilisateurs (dédoublonnage des ids). */
export function emitToManyUserRooms(userIds: string[], event: string, payload: unknown) {
  if (!messageIo) return;
  const seen = new Set<string>();
  for (const id of userIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    messageIo.to(`user:${id}`).emit(event, payload);
  }
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
  private async getConversationForViewer(conversationId: string, viewerId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1_id: viewerId }, { user2_id: viewerId }],
      },
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
    if (!conversation) throw makeHttpError('Conversation non trouvee ou acces non autorise', 404);
    if ((conversation as any).pinned_message?.deleted_for_all_at) {
      (conversation as any).pinned_message.content = 'Ce message a été supprimé';
    }
    const cleared =
      conversation.user1_id === viewerId
        ? (conversation as any).cleared_before_at_user1
        : (conversation as any).cleared_before_at_user2;
    if (cleared && (conversation as any).pinned_message) {
      const pinAt = new Date((conversation as any).pinned_message.created_at);
      if (pinAt <= new Date(cleared)) {
        (conversation as any).pinned_message = null;
      }
    }
    return conversation;
  }

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

  async getOrCreateConversation(user1Id: string, user2Id: string, viewerId?: string | null) {
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

    const vId = viewerId ?? null;
    if (vId && conversation) {
      const cleared =
        conversation.user1_id === vId
          ? (conversation as any).cleared_before_at_user1
          : (conversation as any).cleared_before_at_user2;
      if (cleared && (conversation as any).pinned_message) {
        const pinAt = new Date((conversation as any).pinned_message.created_at);
        if (pinAt <= new Date(cleared)) {
          (conversation as any).pinned_message = null;
        }
      }
    }
    return conversation;
  }

  async getConversationById(conversationId: string, userId: string) {
    return this.getConversationForViewer(conversationId, userId);
  }

  async getMessages(conversationId: string, cursor?: string | null, limit: number = MESSAGES_PAGE_SIZE, userId: string | null = null) {
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ...(userId ? { OR: [{ user1_id: userId }, { user2_id: userId }] } : {}),
      },
      select: {
        id: true,
        user1_id: true,
        user2_id: true,
        cleared_before_at_user1: true,
        cleared_before_at_user2: true,
      },
    });
    if (!conv) throw new Error('Conversation non trouvee ou acces non autorise');

    const take = Math.min(50, Math.max(1, limit)) + 1;

    const now = new Date();
    const clearedBefore =
      userId && conv.user1_id === userId
        ? conv.cleared_before_at_user1
        : userId && conv.user2_id === userId
          ? conv.cleared_before_at_user2
          : null;

    const createdAtFilter: { lt?: Date; gt?: Date } = {};
    if (cursor) createdAtFilter.lt = new Date(cursor);
    if (clearedBefore) createdAtFilter.gt = clearedBefore;

    const where: Prisma.MessageWhereInput = {
      conversation_id: conversationId,
      is_deleted: false,
      AND: [
        {
          OR: [
            { is_ephemeral: false },
            { is_ephemeral: true, expires_at: { gt: now } },
            { is_ephemeral: true, expires_at: null },
          ],
        },
        // Les messages programmés ne sont visibles que par l’expéditeur jusqu’à l’envoi effectif
        ...(userId
          ? [
              {
                OR: [{ status: { not: 'scheduled' } }, { sender_id: userId }],
              },
            ]
          : []),
      ],
    };
    if (Object.keys(createdAtFilter).length > 0) {
      (where as Prisma.MessageWhereInput).created_at = createdAtFilter;
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
        event_ref: {
          select: {
            id: true,
            title: true,
            image: true,
            start_date: true,
            end_date: true,
            location: true,
            status: true,
            event_type: true,
            virtual_url: true,
          },
        },
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
          poll_options: null,
          poll_votes: null,
          event_id: null,
          event_ref: null,
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
      poll_options?: unknown;
      event_id?: string;
    }
  ) {
    const blocked = await this.isBlocked(senderId, recipientId);
    if (blocked) throw makeHttpError('Impossible d\'envoyer un message à cet utilisateur', 403);

    const normalizedType = String(type || 'text').trim().toLowerCase();
    const allowedTypes = new Set([
      'text',
      'image',
      'video',
      'audio',
      'voice',
      'file',
      'sticker',
      'location',
      'contact',
      'poll',
      'event',
    ]);
    if (!allowedTypes.has(normalizedType)) {
      throw makeHttpError('Type de message invalide', 400);
    }

    const rawContent = typeof content === 'string' ? content : '';
    const maskedContent = maskSensitiveContacts(rawContent.trim()).slice(0, 2000);
    const mediaUrl = options?.media_url ? String(options.media_url).trim() : '';
    const thumbnailUrl = options?.thumbnail_url ? String(options.thumbnail_url).trim() : '';
    const stickerUrl = options?.sticker_url ? String(options.sticker_url).trim() : '';

    if (normalizedType === 'poll') {
      if (mediaUrl || thumbnailUrl || stickerUrl) {
        throw makeHttpError('Un sondage ne peut pas inclure de média', 400);
      }
      const question = maskSensitiveContacts(rawContent.trim()).slice(0, GROUP_POLL_MAX_QUESTION_LEN);
      if (!question) throw makeHttpError('Question du sondage requise', 400);
      const pollOpts = normalizePollOptions(options?.poll_options);
      if (pollOpts.length < GROUP_POLL_MIN_OPTIONS || pollOpts.length > GROUP_POLL_MAX_OPTIONS) {
        throw makeHttpError(
          `Le sondage doit avoir entre ${GROUP_POLL_MIN_OPTIONS} et ${GROUP_POLL_MAX_OPTIONS} options valides`,
          400
        );
      }
    } else if (normalizedType === 'event') {
      if (mediaUrl || thumbnailUrl || stickerUrl) {
        throw makeHttpError('Un événement partagé ne peut pas inclure de média', 400);
      }
      const eid = options?.event_id ? String(options.event_id).trim() : '';
      if (!eid) throw makeHttpError('event_id requis pour partager un événement', 400);
    } else {
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
    }

    const conversation = await this.getOrCreateConversation(senderId, recipientId);
    if (!conversation) throw makeHttpError('Conversation introuvable', 404);
    const otherId = conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id;

    let shareEventId: string | null = null;
    let shareEventTitle = '';
    if (normalizedType === 'event') {
      const eid = String(options?.event_id || '').trim();
      const ev = await prisma.event.findFirst({
        where: { id: eid },
        select: { id: true, title: true, status: true, organizer_id: true },
      });
      if (!ev) throw makeHttpError('Événement introuvable', 404);
      if (ev.status !== 'published' && ev.organizer_id !== senderId) {
        throw makeHttpError('Cet événement ne peut pas être partagé', 403);
      }
      shareEventTitle = maskSensitiveContacts((ev.title || '').trim()).slice(0, 500);
      if (!shareEventTitle) throw makeHttpError('Événement sans titre', 400);
      shareEventId = ev.id;
    }

    const isEphemeral = Boolean(options?.is_ephemeral);
    const expiresAt = options?.expires_at ? new Date(options.expires_at) : (isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null);
    const scheduledAt = options?.scheduled_at ? new Date(options.scheduled_at) : null;
    const isScheduled = scheduledAt != null && scheduledAt.getTime() > Date.now();

    const isPoll = normalizedType === 'poll';
    const isEvent = normalizedType === 'event' && shareEventId != null;
    const pollQuestion = isPoll ? maskSensitiveContacts(rawContent.trim()).slice(0, GROUP_POLL_MAX_QUESTION_LEN) : '';
    const pollOptsStored = isPoll ? normalizePollOptions(options?.poll_options) : [];

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        content: isPoll
          ? pollQuestion
          : isEvent
            ? shareEventTitle
            : normalizedType === 'location'
              ? (options?.location_label || `${options?.location_lat},${options?.location_lng}`)
              : maskedContent,
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
        ...(isPoll
          ? {
              poll_options: pollOptsStored as Prisma.InputJsonValue,
              poll_votes: {} as Prisma.InputJsonValue,
            }
          : {}),
        ...(isEvent && shareEventId ? { event_id: shareEventId } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
        event_ref: {
          select: {
            id: true,
            title: true,
            image: true,
            start_date: true,
            end_date: true,
            location: true,
            status: true,
            event_type: true,
            virtual_url: true,
          },
        },
      },
    });

    if (isScheduled) {
      logger.info('Message programmé créé', { messageId: message.id, conversationId: conversation.id, scheduled_at: scheduledAt });
      return message;
    }

    const prevMap = (conversation.unread_count_map as UnreadCountMap) || {};
    const newMap = incrementUnreadForUser(prevMap, otherId);

    const lastText = isPoll
      ? `📊 ${pollQuestion.slice(0, 120)}`
      : isEvent
        ? `📅 ${shareEventTitle.slice(0, 120)}`
        : normalizedType === 'text'
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
          message:
            normalizedType === 'text'
              ? (maskedContent.slice(0, 120) || 'Message recu')
              : isPoll
                ? `📊 ${pollQuestion.slice(0, 120)}`.trim() || 'Sondage'
                : isEvent
                  ? `📅 ${shareEventTitle.slice(0, 120)}`.trim() || 'Événement'
                  : `Nouveau ${normalizedType}`,
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
        event_ref: {
          select: {
            id: true,
            title: true,
            image: true,
            start_date: true,
            end_date: true,
            location: true,
            status: true,
            event_type: true,
            virtual_url: true,
          },
        },
      },
    });
    if (!message) return false;

    const conv = message.conversation;
    const senderId = message.sender_id;
    const otherId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
    const t = String(message.type || 'text').toLowerCase();
    const lastText =
      t === 'text'
        ? (message.content?.slice(0, 200) || 'Message')
        : t === 'poll'
          ? `📊 ${(message.content || '').slice(0, 120)}`
          : t === 'event'
            ? `📅 ${(message.content || '').slice(0, 120)}`
            : message.type;
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
        message:
          t === 'text'
            ? (message.content?.slice(0, 120) || 'Message reçu')
            : t === 'poll'
              ? `📊 ${(message.content || '').slice(0, 120)}`.trim() || 'Sondage'
              : t === 'event'
                ? `📅 ${(message.content || '').slice(0, 120)}`.trim() || 'Événement'
                : `Nouveau ${message.type}`,
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

  async markAsDelivered(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
    });
    if (!conv) return { success: false, updated: 0 };

    const result = await prisma.message.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        status: 'sent',
        is_deleted: false,
      },
      data: { status: 'delivered' },
    });

    if (result.count > 0 && messageIo) {
      messageIo.to(`conversation:${conversationId}`).emit('message:delivered', { conversationId, userId });
    }
    return { success: true, updated: result.count };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true, user1_id: true, user2_id: true, unread_count_map: true },
    });
    if (!conv) return { success: false };

    const newMap = setUnreadForUser(conv.unread_count_map as UnreadCountMap | null, userId, 0);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unread_count_map: newMap },
    });

    const partnerId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
    const [reader, partner] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { messaging_read_receipts_enabled: true },
      }),
      prisma.user.findUnique({
        where: { id: partnerId },
        select: { messaging_read_receipts_enabled: true },
      }),
    ]);
    const readerOk = reader?.messaging_read_receipts_enabled !== false;
    const partnerOk = partner?.messaging_read_receipts_enabled !== false;
    const shouldPropagateRead = readerOk && partnerOk;

    if (shouldPropagateRead) {
      await prisma.message.updateMany({
        where: {
          conversation_id: conversationId,
          sender_id: { not: userId },
          status: { in: ['sent', 'delivered'] },
        },
        data: { status: 'read' },
      });

      if (messageIo) {
        messageIo.to(`conversation:${conversationId}`).emit('message:read', { conversationId, userId });
      }
    }

    logger.info('Messages marked as read', { conversationId, userId, readReceiptsPropagated: shouldPropagateRead });
    return { success: true, readReceiptsPropagated: shouldPropagateRead };
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

  /** Effacer le contenu de la discussion pour l’utilisateur courant (les messages restent chez l’autre). */
  async clearConversationHistoryForUser(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { id: true, user1_id: true, user2_id: true },
    });
    if (!conv) throw makeHttpError('Conversation non trouvée', 404);
    const now = new Date();
    const isUser1 = conv.user1_id === userId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isUser1 ? { cleared_before_at_user1: now } : { cleared_before_at_user2: now },
    });
    return { success: true, clearedAt: now };
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
  /** Édition du texte (expéditeur, messages texte uniquement, dans les 15 min après envoi). */
  private static readonly EDIT_MESSAGE_WINDOW_MS = 15 * 60 * 1000;

  async editMessageContent(messageId: string, userId: string, rawContent: string) {
    const msg = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      },
    });
    if (!msg) throw makeHttpError('Message non trouvé ou accès non autorisé', 404);
    if (msg.sender_id !== userId) throw makeHttpError('Seul l’expéditeur peut modifier ce message', 403);
    if (msg.is_deleted) throw makeHttpError('Message supprimé', 400);
    if (msg.deleted_for_all_at) throw makeHttpError('Message non modifiable', 400);
    if (String(msg.type || 'text').toLowerCase() !== 'text') {
      throw makeHttpError('Seuls les messages texte peuvent être modifiés', 400);
    }
    const elapsed = Date.now() - msg.created_at.getTime();
    if (elapsed > MessageService.EDIT_MESSAGE_WINDOW_MS) {
      throw makeHttpError('La modification n’est possible que dans les 15 minutes suivant l’envoi', 400);
    }
    const maskedContent = maskSensitiveContacts(String(rawContent ?? '').trim()).slice(0, 2000);
    if (!maskedContent) throw makeHttpError('Le contenu texte est requis', 400);

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: maskedContent, is_edited: true },
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
        reply_to: { select: { id: true, content: true, type: true, sender_id: true, created_at: true } },
      },
    });

    const convPreview = await prisma.conversation.findFirst({
      where: { id: msg.conversation_id },
      select: { last_message_id: true },
    });
    if (convPreview?.last_message_id === messageId) {
      await prisma.conversation.update({
        where: { id: msg.conversation_id },
        data: { last_message_text: maskedContent.slice(0, 200) },
      });
    }

    if (messageIo) {
      messageIo.to(`conversation:${msg.conversation_id}`).emit('message:updated', {
        messageId,
        content: updated.content,
        is_edited: true,
        reactions: updated.reactions,
      });
    }
    logger.info('Message edited', { messageId, userId });
    return updated;
  }

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
        poll_options: Prisma.JsonNull,
        poll_votes: Prisma.JsonNull,
        event_id: null,
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

  /** Liste des personnes ayant réagi (1-1 ou groupe : accès si participant à la conversation du message). */
  async getMessageReactionsDetail(messageId: string, viewerId: string) {
    const msg = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: { OR: [{ user1_id: viewerId }, { user2_id: viewerId }] },
      },
      select: { id: true, reactions: true },
    });
    if (!msg) throw makeHttpError('Message non trouvé ou accès non autorisé', 404);

    const raw = msg.reactions;
    const map =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
    const userIds = Object.keys(map);
    if (userIds.length === 0) {
      return { reactors: [] as Array<{ user_id: string; emoji: string; username: string | null; full_name: string | null; profile_image: string | null }> };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, full_name: true, profile_image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const reactors = userIds.map((uid) => ({
      user_id: uid,
      emoji: String(map[uid] || '').trim().slice(0, 16),
      username: byId.get(uid)?.username ?? null,
      full_name: byId.get(uid)?.full_name ?? null,
      profile_image: byId.get(uid)?.profile_image ?? null,
    }));
    reactors.sort((a, b) =>
      (a.full_name || a.username || a.user_id).localeCompare(b.full_name || b.username || b.user_id, 'fr', {
        sensitivity: 'base',
      })
    );
    return { reactors };
  }

  /** Transcription Whisper — message vocal 1-1, expéditeur uniquement. */
  async transcribeVoiceMessage(messageId: string, userId: string) {
    const msg = await prisma.message.findFirst({
      where: {
        id: messageId,
        sender_id: userId,
        is_deleted: false,
        conversation: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      },
    });
    if (!msg) throw makeHttpError('Message introuvable', 404);
    const t = String(msg.type || '').toLowerCase();
    if (!['voice', 'audio'].includes(t)) throw makeHttpError('Seuls les messages vocaux sont transcrits', 400);
    if (!msg.media_url) throw makeHttpError('Fichier audio manquant', 400);
    if (msg.transcription_text) return { text: msg.transcription_text, cached: true };

    const audioRes = await fetch(msg.media_url);
    if (!audioRes.ok) throw makeHttpError('Téléchargement audio impossible', 502);
    const buf = Buffer.from(await audioRes.arrayBuffer());

    let text: string;
    try {
      text = await transcribeBufferWithWhisper(buf, { filename: 'voice.webm', mime: 'audio/webm' });
    } catch (e: unknown) {
      const err = e as Error & { statusCode?: number };
      if (typeof err.statusCode === 'number') {
        throw makeHttpError(err.message || 'Erreur de transcription', err.statusCode);
      }
      throw e;
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { transcription_text: text },
    });

    if (messageIo) {
      messageIo.to(`conversation:${msg.conversation_id}`).emit('message:updated', {
        messageId,
        transcription_text: text,
      });
    }
    return { text, cached: false };
  }

  /** Vote sur un sondage 1-1 (un vote par participant, remplace le précédent). */
  async voteDmPoll(messageId: string, userId: string, optionIndexRaw: unknown) {
    const msg = await prisma.message.findFirst({
      where: {
        id: messageId,
        type: 'poll',
        is_deleted: false,
        conversation: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      },
    });
    if (!msg) throw makeHttpError('Sondage introuvable', 404);

    const idx = Number(optionIndexRaw);
    const opts = msg.poll_options;
    const arr = Array.isArray(opts) ? opts.map((x) => String(x)) : [];
    if (!Number.isFinite(idx) || idx !== Math.floor(idx) || idx < 0 || idx >= arr.length) {
      throw makeHttpError('Option invalide', 400);
    }

    let votes: Record<string, number> = {};
    if (msg.poll_votes && typeof msg.poll_votes === 'object' && !Array.isArray(msg.poll_votes)) {
      votes = { ...(msg.poll_votes as Record<string, number>) };
    }
    votes[userId] = idx;

    await prisma.message.update({
      where: { id: messageId },
      data: { poll_votes: votes as Prisma.InputJsonValue },
    });

    if (messageIo) {
      messageIo.to(`conversation:${msg.conversation_id}`).emit('message:updated', {
        messageId,
        poll_votes: votes,
      });
    }

    return { id: messageId, poll_votes: votes };
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

  /** Export des conversations de l'utilisateur (sauvegarde cloud) — exclut messages éphémères expirés. Si `conversationId` est fourni, une seule conversation (vérification membre). */
  async exportConversations(
    userId: string,
    options?: { conversationId?: string | null }
  ): Promise<{ conversations: Array<{ conversationId: string; otherUser: { id: string; username: string; full_name: string | null }; messages: Array<Record<string, unknown>> }> }> {
    const convInclude = {
      user1: { select: { id: true, username: true, full_name: true } },
      user2: { select: { id: true, username: true, full_name: true } },
    };
    let convs;
    const onlyId = options?.conversationId ? String(options.conversationId).trim() : '';
    if (onlyId) {
      const one = await prisma.conversation.findFirst({
        where: { id: onlyId, OR: [{ user1_id: userId }, { user2_id: userId }] },
        include: convInclude,
      });
      if (!one) throw makeHttpError('Conversation non trouvée', 404);
      convs = [one];
    } else {
      convs = await prisma.conversation.findMany({
        where: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
        },
        include: convInclude,
        orderBy: { last_message_at: 'desc' },
      });
    }
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

  /** Aperçu court pour listes (messages programmés, etc.). */
  private static scheduledPreviewLine(type: string, content: string): string {
    const t = String(type || 'text').toLowerCase();
    const c = (content || '').trim();
    if (t === 'poll') return `📊 ${c.slice(0, 100)}`.trim() || 'Sondage';
    if (t === 'event') return `📅 ${c.slice(0, 100)}`.trim() || 'Événement';
    if (t === 'image') return 'Image';
    if (t === 'video') return 'Vidéo';
    if (t === 'audio' || t === 'voice') return 'Message vocal';
    if (t === 'file') return c.slice(0, 80) || 'Document';
    if (t === 'location') return 'Position';
    if (t === 'contact') return 'Contact';
    if (t === 'sticker') return 'Sticker';
    return c.slice(0, 140) || 'Message';
  }

  /** Messages DM programmés par l’utilisateur (CDC — vue centralisée). */
  async listScheduledDmForUser(userId: string) {
    const rows = await prisma.message.findMany({
      where: {
        sender_id: userId,
        status: 'scheduled',
        scheduled_at: { not: null },
        is_deleted: false,
      },
      select: {
        id: true,
        conversation_id: true,
        content: true,
        type: true,
        scheduled_at: true,
        conversation: {
          select: {
            user1_id: true,
            user2_id: true,
            user1: { select: { id: true, username: true, full_name: true } },
            user2: { select: { id: true, username: true, full_name: true } },
          },
        },
      },
      orderBy: { scheduled_at: 'asc' },
      take: 100,
    });
    return rows.map((m) => {
      const c = m.conversation;
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const otherId = other.id;
      const peerLabel = String(other.full_name || other.username || 'Discussion').trim().slice(0, 100) || 'Discussion';
      return {
        channel: 'dm' as const,
        message_id: m.id,
        conversation_id: m.conversation_id,
        other_user_id: otherId,
        peer_display_name: peerLabel,
        scheduled_at: m.scheduled_at!.toISOString(),
        type: m.type,
        preview: MessageService.scheduledPreviewLine(m.type, m.content),
      };
    });
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
