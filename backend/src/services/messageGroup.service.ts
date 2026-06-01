/**
 * Service messagerie groupes — CDC Super-App AfriWonder.
 * Création de groupes, envoi de messages, gestion des membres.
 */

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { transcribeBufferWithWhisper } from '../utils/whisperTranscription.js';
import { emitToGroupRoom } from './message.service.js';
import notificationService from './notification.service.js';
import {
  GROUP_POLL_MAX_OPTIONS,
  GROUP_POLL_MAX_QUESTION_LEN,
  GROUP_POLL_MIN_OPTIONS,
  normalizePollOptions,
} from '../utils/pollMessage.js';
import {
  isHiddenForUser,
  withUserInHiddenList,
} from '../utils/messageHiddenForUser.js';

const DEFAULT_PAGE_SIZE = 30;
/** CDC messagerie : aligné sur la cible type WhatsApp (1024). */
const MAX_GROUP_MEMBERS = 1024;
const MAX_GROUP_DISPLAY_TAG_LENGTH = 40;

const MAX_GROUP_NAME_LENGTH = 100;
const MAX_GROUP_DESCRIPTION_LENGTH = 500;

function makeError(message: string, statusCode: number): Error & { statusCode?: number } {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  return err;
}

/** Préférences CDC modération (User.messaging_cdc_moderation). */
async function getMessagingCdcModerationPrefs(userId: string): Promise<{
  silentLeave: boolean;
  forwardLimit: boolean;
}> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { messaging_cdc_moderation: true },
  });
  const raw = u?.messaging_cdc_moderation;
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    silentLeave: obj.silentLeave === true,
    forwardLimit: obj.forwardLimit !== false,
  };
}

function maskSensitiveEventTitle(input: string): string {
  let out = String(input || '').trim();
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact masque]');
  out = out.replace(/(?<!\w)(\+?\d[\d\s().-]{6,}\d)(?!\w)/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return '[contact masque]';
    return match;
  });
  return out.slice(0, 500);
}

const groupMessageReplySelect = {
  id: true,
  content: true,
  type: true,
  sender_id: true,
  created_at: true,
  is_deleted: true,
  sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
} as const;

type GroupMsgWithSender = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  created_at: Date;
  is_deleted: boolean;
  reactions: unknown;
  transcription_text: string | null;
  poll_options?: unknown;
  poll_votes?: unknown;
  sender: {
    id: string;
    username: string;
    full_name: string | null;
    profile_image: string | null;
    group_tag?: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    type: string;
    sender_id: string;
    created_at: Date;
    is_deleted: boolean;
    sender: { id: string; username: string; full_name: string | null; profile_image: string | null };
  } | null;
  event_id?: string | null;
  event_ref?: {
    id: string;
    title: string;
    image: string | null;
    start_date: Date;
    end_date: Date;
    location: string | null;
    status: string;
    event_type: string;
    virtual_url: string | null;
  } | null;
  status?: string;
  scheduled_at?: Date | null;
};

async function buildGroupMemberTagMap(groupId: string): Promise<Record<string, string | null>> {
  const rows = await prisma.conversationGroupMember.findMany({
    where: { group_id: groupId },
    select: { user_id: true, group_display_tag: true },
  });
  const map: Record<string, string | null> = {};
  for (const r of rows) {
    const t =
      r.group_display_tag != null
        ? String(r.group_display_tag).trim().slice(0, MAX_GROUP_DISPLAY_TAG_LENGTH)
        : '';
    map[r.user_id] = t.length > 0 ? t : null;
  }
  return map;
}

function formatGroupMessagePayload(
  m: GroupMsgWithSender,
  tagByUserId?: Record<string, string | null | undefined>
) {
  const rawTag = tagByUserId?.[m.sender_id];
  const groupTag =
    rawTag != null && String(rawTag).trim().length > 0
      ? String(rawTag).trim().slice(0, MAX_GROUP_DISPLAY_TAG_LENGTH)
      : null;
  return {
    id: m.id,
    group_id: m.group_id,
    sender_id: m.sender_id,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      full_name: m.sender.full_name,
      profile_image: m.sender.profile_image,
      group_tag: groupTag,
    },
    content: m.content,
    type: m.type,
    media_url: m.media_url,
    thumbnail_url: m.thumbnail_url,
    created_at: m.created_at,
    is_deleted: m.is_deleted,
    is_edited: (m as { is_edited?: boolean }).is_edited ?? false,
    reactions: m.reactions,
    transcription_text: m.transcription_text,
    poll_options: Array.isArray(m.poll_options) ? m.poll_options : null,
    poll_votes:
      m.poll_votes != null && typeof m.poll_votes === 'object' && !Array.isArray(m.poll_votes)
        ? (m.poll_votes as Record<string, number>)
        : {},
    event_id: m.event_id ?? null,
    event_ref:
      m.event_ref && typeof m.event_ref === 'object' && (m.event_ref as { id?: string }).id
        ? {
            id: (m.event_ref as { id: string }).id,
            title: (m.event_ref as { title: string }).title,
            image: (m.event_ref as { image: string | null }).image ?? null,
            start_date: (m.event_ref as { start_date: Date }).start_date,
            end_date: (m.event_ref as { end_date: Date }).end_date,
            location: (m.event_ref as { location: string | null }).location ?? null,
            status: (m.event_ref as { status: string }).status,
            event_type: (m.event_ref as { event_type: string }).event_type,
            virtual_url: (m.event_ref as { virtual_url: string | null }).virtual_url ?? null,
          }
        : null,
    reply_to: m.reply_to
      ? {
          id: m.reply_to.id,
          content: m.reply_to.is_deleted ? '' : m.reply_to.content,
          type: m.reply_to.type,
          sender_id: m.reply_to.sender_id,
          created_at: m.reply_to.created_at,
          is_deleted: m.reply_to.is_deleted,
          sender: m.reply_to.sender,
        }
      : null,
    status: (m as { status?: string }).status ?? 'sent',
    scheduled_at: m.scheduled_at ? m.scheduled_at.toISOString() : null,
    forwarded_from_message_id:
      (m as { forwarded_from_message_id?: string | null }).forwarded_from_message_id ?? null,
  };
}

/** Après enregistrement d’un message « envoyé » : fil du groupe, socket, notifications. */
async function applyGroupMessageDeliverySideEffects(
  groupId: string,
  senderId: string,
  message: GroupMsgWithSender & { id: string },
  preview: string,
  normalizedType: string,
  rawTextForMentions: string
) {
  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: {
      last_message_at: message.created_at,
      last_message_text: preview,
      updated_at: message.created_at,
    },
  });

  await prisma.conversationGroupMember
    .update({
      where: { group_id_user_id: { group_id: groupId, user_id: senderId } },
      data: { last_read_at: message.created_at },
    })
    .catch(() => {});

  const tagMapForPayload = await buildGroupMemberTagMap(groupId);
  const payload = formatGroupMessagePayload(message, tagMapForPayload);
  emitToGroupRoom(groupId, 'message:new', { groupId, message: payload });

  const otherMembers = await prisma.conversationGroupMember.findMany({
    where: { group_id: groupId, user_id: { not: senderId } },
    select: {
      user_id: true,
      notifications_muted: true,
      user: { select: { username: true } },
    },
  });

  const mentionUserIds = new Set<string>();
  if (normalizedType === 'text' && rawTextForMentions.trim()) {
    const textBody = rawTextForMentions.trim().slice(0, 10000);
    const mentionRegex = /@(\w+)/g;
    let mm;
    const mentionedLower = new Set<string>();
    while ((mm = mentionRegex.exec(textBody)) !== null) {
      mentionedLower.add(mm[1].toLowerCase());
    }
    if (mentionedLower.size > 0) {
      const grp = await prisma.conversationGroup.findUnique({
        where: { id: groupId },
        select: { name: true },
      });
      const titleBase = grp?.name?.trim() ? grp.name.trim() : 'Groupe';
      const senderLabel =
        message.sender.full_name?.trim() || message.sender.username?.trim() || "Quelqu'un";
      for (const row of otherMembers) {
        const un = row.user?.username?.trim();
        if (!un || row.notifications_muted) continue;
        if (!mentionedLower.has(un.toLowerCase())) continue;
        mentionUserIds.add(row.user_id);
        try {
          await notificationService.create(row.user_id, {
            type: 'group_mention',
            title: `Mention · ${titleBase}`,
            message: `${senderLabel} vous a mentionné : ${textBody.slice(0, 120)}`,
            reference_type: 'conversation_group',
            reference_id: groupId,
            data: { groupId, messageId: message.id, senderId },
          });
        } catch (err) {
          logger.warn('Group mention notification failed', { groupId, recipientId: row.user_id, err });
        }
      }
    }
  }

  if (otherMembers.length > 0) {
    const grp = await prisma.conversationGroup.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const senderLabel =
      message.sender.full_name?.trim() || message.sender.username?.trim() || "Quelqu'un";
    const titleBase = grp?.name?.trim() ? grp.name.trim() : 'Groupe';
    const bodyLine = `${senderLabel}: ${preview}`.slice(0, 200);
    for (const r of otherMembers) {
      if (r.notifications_muted) continue;
      if (mentionUserIds.has(r.user_id)) continue;
      try {
        await notificationService.create(r.user_id, {
          type: 'group_message_new',
          title: titleBase,
          message: bodyLine,
          reference_type: 'conversation_group',
          reference_id: groupId,
          data: { groupId, messageId: message.id, senderId },
        });
      } catch (err) {
        logger.warn('Group message notification failed', { groupId, recipientId: r.user_id, err });
      }
    }
  }

  return payload;
}

export async function createGroup(creatorId: string, name: string, memberIds: string[]) {
  const trimmedName = (name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH) || 'Groupe';
  const uniqueMembers = [...new Set([creatorId, ...(memberIds || []).filter(Boolean)])];
  if (uniqueMembers.length > MAX_GROUP_MEMBERS) throw makeError('Trop de membres', 400);

  const group = await prisma.conversationGroup.create({
    data: {
      name: trimmedName,
      created_by_id: creatorId,
      members: {
        create: uniqueMembers.map((userId, i) => ({
          user_id: userId,
          role: userId === creatorId ? 'admin' : 'member',
        })),
      },
    },
    include: {
      members: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } },
      created_by: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
  });

  return {
    id: group.id,
    name: group.name,
    avatar_url: group.avatar_url,
    created_by_id: group.created_by_id,
    created_at: group.created_at,
    members: group.members.map((m) => ({ ...m.user, role: m.role })),
    created_by: group.created_by,
  };
}

async function unreadCountsForGroupIds(viewerId: string, groupIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (groupIds.length === 0) return map;
  const rows = await prisma.$queryRaw<{ group_id: string; c: bigint }[]>`
    SELECT gm."group_id", COUNT(*)::bigint AS c
    FROM "GroupMessage" gm
    INNER JOIN "ConversationGroupMember" m ON m."group_id" = gm."group_id" AND m."user_id" = ${viewerId}
    WHERE gm."is_deleted" = false
      AND gm."sender_id" <> ${viewerId}
      AND gm."created_at" > COALESCE(m."last_read_at", m."joined_at")
      AND gm."group_id" IN (${Prisma.join(groupIds)})
    GROUP BY gm."group_id"
  `;
  for (const r of rows) map.set(r.group_id, Number(r.c));
  return map;
}

/** Total messages de groupe non lus (badge header / agrégat). */
export async function getTotalUnreadGroupMessagesForUser(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM "GroupMessage" gm
    INNER JOIN "ConversationGroupMember" m ON m."group_id" = gm."group_id" AND m."user_id" = ${userId}
    WHERE gm."is_deleted" = false
      AND gm."sender_id" <> ${userId}
      AND gm."created_at" > COALESCE(m."last_read_at", m."joined_at")
  `;
  return Number(rows[0]?.c ?? 0);
}

export async function markGroupAsRead(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const latest = await prisma.groupMessage.findFirst({
    where: { group_id: groupId, is_deleted: false },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });
  const at = latest?.created_at ?? new Date();

  await prisma.conversationGroupMember.update({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } },
    data: { last_read_at: at },
  });

  return { success: true, last_read_at: at };
}

export async function listMyGroups(userId: string, page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit;
  const take = Math.min(50, Math.max(1, limit));

  const [groups, total] = await Promise.all([
    prisma.conversationGroup.findMany({
      where: { members: { some: { user_id: userId } } },
      include: {
        created_by: { select: { id: true, username: true, full_name: true, profile_image: true } },
        members: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } },
        _count: { select: { messages: true } },
      },
      orderBy: { last_message_at: 'desc' },
      skip,
      take,
    }),
    prisma.conversationGroup.count({ where: { members: { some: { user_id: userId } } } }),
  ]);

  const unreadMap = await unreadCountsForGroupIds(
    userId,
    groups.map((g) => g.id)
  );

  return {
    groups: groups.map((g) => {
      const myMembership = g.members.find((m) => m.user_id === userId);
      return {
        id: g.id,
        name: g.name,
        avatar_url: g.avatar_url,
        created_by_id: g.created_by_id,
        last_message_at: g.last_message_at,
        last_message_text: g.last_message_text,
        created_at: g.created_at,
        members_count: g.members.length,
        members: g.members.map((m) => {
          const t =
            m.group_display_tag != null
              ? String(m.group_display_tag).trim().slice(0, MAX_GROUP_DISPLAY_TAG_LENGTH)
              : '';
          return { ...m.user, role: m.role, group_tag: t.length > 0 ? t : null };
        }),
        created_by: g.created_by,
        unread_count: unreadMap.get(g.id) ?? 0,
        notifications_muted: myMembership?.notifications_muted ?? false,
      };
    }),
    pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) },
  };
}

export async function getGroup(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
    include: {
      group: {
        include: {
          created_by: { select: { id: true, username: true, full_name: true, profile_image: true } },
          members: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } },
          pinned_message: {
            include: {
              sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
              reply_to: { select: groupMessageReplySelect },
            },
          },
        },
      },
    },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);
  const g = member.group;
  const pin = g.pinned_message;
  const pinTagMap = pin ? await buildGroupMemberTagMap(g.id) : undefined;
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    avatar_url: g.avatar_url,
    created_by_id: g.created_by_id,
    created_at: g.created_at,
    last_message_at: g.last_message_at,
    last_message_text: g.last_message_text,
    pinned_message_id: g.pinned_message_id,
    pinned_message: pin ? formatGroupMessagePayload(pin as GroupMsgWithSender, pinTagMap) : null,
    members: g.members.map((m) => {
      const t =
        m.group_display_tag != null
          ? String(m.group_display_tag).trim().slice(0, MAX_GROUP_DISPLAY_TAG_LENGTH)
          : '';
      return { ...m.user, role: m.role, group_tag: t.length > 0 ? t : null };
    }),
    created_by: g.created_by,
    notifications_muted: member.notifications_muted,
    invite_token: member.role === 'admin' ? (g as { invite_token?: string | null }).invite_token : undefined,
  };
}

/** Générer un lien d'invitation (admin uniquement). Invalide l'ancien token. */
export async function generateGroupInviteToken(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);
  if (member.role !== 'admin') throw makeError('Seul un admin peut générer un lien d\'invitation', 403);

  const token = crypto.randomBytes(20).toString('base64url');
  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: { invite_token: token },
  });

  emitToGroupRoom(groupId, 'group:updated', { groupId, invite_token: token });
  const group = await getGroup(groupId, userId);
  return { token, group };
}

/** Révoquer le lien d'invitation (admin uniquement). */
export async function revokeGroupInviteToken(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);
  if (member.role !== 'admin') throw makeError('Seul un admin peut révoquer le lien d\'invitation', 403);

  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: { invite_token: null },
  });

  emitToGroupRoom(groupId, 'group:updated', { groupId, invite_token: null });
  return getGroup(groupId, userId);
}

/** Rejoindre un groupe via token d'invitation. */
export async function joinGroupByInviteToken(token: string, userId: string) {
  const t = String(token || '').trim();
  if (!t) throw makeError('Token d\'invitation requis', 400);

  const group = await prisma.conversationGroup.findFirst({
    where: { invite_token: t },
    select: { id: true, name: true },
  });
  if (!group) throw makeError('Lien d\'invitation invalide ou expiré', 404);

  const existing = await prisma.conversationGroupMember.findFirst({
    where: { group_id: group.id, user_id: userId },
  });
  if (existing) throw makeError('Vous êtes déjà membre de ce groupe', 400);

  const memberCount = await prisma.conversationGroupMember.count({
    where: { group_id: group.id },
  });
  if (memberCount >= MAX_GROUP_MEMBERS) throw makeError('Le groupe est complet', 400);

  await prisma.conversationGroupMember.create({
    data: { group_id: group.id, user_id: userId, role: 'member' },
  });

  emitToGroupRoom(group.id, 'group:members-updated', { groupId: group.id });
  return getGroup(group.id, userId);
}

/** Sourdine des notifications pour ce groupe (utilisateur courant uniquement). */
export async function setGroupNotificationsMuted(groupId: string, userId: string, muted: boolean) {
  const row = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!row) throw makeError('Groupe non trouvé ou accès refusé', 404);

  await prisma.conversationGroupMember.update({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } },
    data: { notifications_muted: !!muted },
  });

  return getGroup(groupId, userId);
}

/** Mise à jour nom / avatar / description — admin uniquement. */
export async function updateGroup(
  groupId: string,
  userId: string,
  updates: { name?: string | null; avatar_url?: string | null; description?: string | null }
) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);
  if (member.role !== 'admin') throw makeError('Seul un admin peut modifier le groupe', 403);

  const data: { name?: string; avatar_url?: string | null; description?: string | null } = {};
  if (updates.name !== undefined && updates.name !== null) {
    const n = String(updates.name).trim().slice(0, MAX_GROUP_NAME_LENGTH);
    if (!n) throw makeError('Le nom du groupe ne peut pas être vide', 400);
    data.name = n;
  }
  if (updates.avatar_url !== undefined) {
    data.avatar_url =
      updates.avatar_url == null || String(updates.avatar_url).trim() === ''
        ? null
        : String(updates.avatar_url).trim().slice(0, 2048);
  }
  if (updates.description !== undefined) {
    if (updates.description == null || String(updates.description).trim() === '') {
      data.description = null;
    } else {
      data.description = String(updates.description).trim().slice(0, MAX_GROUP_DESCRIPTION_LENGTH);
    }
  }

  if (Object.keys(data).length === 0) {
    throw makeError('Aucune modification fournie', 400);
  }

  await prisma.conversationGroup.update({
    where: { id: groupId },
    data,
  });

  const group = await getGroup(groupId, userId);
  emitToGroupRoom(groupId, 'group:updated', {
    groupId,
    name: group.name,
    avatar_url: group.avatar_url,
    description: group.description,
  });
  return group;
}

export async function pinGroupMessage(groupId: string, messageId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, is_deleted: false, status: { not: 'scheduled' } },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
    },
  });
  if (!msg) throw makeError('Message introuvable ou encore programmé', 404);

  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: { pinned_message_id: messageId },
  });

  const pinTags = await buildGroupMemberTagMap(groupId);
  const payload = formatGroupMessagePayload(msg as GroupMsgWithSender, pinTags);
  emitToGroupRoom(groupId, 'group:message-pinned', {
    groupId,
    pinned_message_id: messageId,
    pinned_message: payload,
  });
  return { success: true, pinned_message_id: messageId, pinned_message: payload };
}

export async function unpinGroupMessage(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: { pinned_message_id: null },
  });

  emitToGroupRoom(groupId, 'group:message-unpinned', { groupId });
  return { success: true };
}

/** Suppression pour tous (soft delete) — expéditeur ou admin. CDC WhatsApp : expéditeur seulement dans l'heure. */
const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000; // 1h

export async function deleteGroupMessage(groupId: string, messageId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, is_deleted: false },
  });
  if (!msg) throw makeError('Message introuvable', 404);
  const isSender = msg.sender_id === userId;
  const isAdmin = member.role === 'admin';
  if (!isSender && !isAdmin) throw makeError('Vous ne pouvez supprimer que vos propres messages', 403);

  const isScheduledPending = String((msg as { status?: string }).status || 'sent') === 'scheduled';
  if (isSender && !isAdmin && !isScheduledPending) {
    const age = Date.now() - msg.created_at.getTime();
    if (age > DELETE_FOR_EVERYONE_WINDOW_MS) {
      throw makeError(
        'La suppression pour tous n’est possible que dans l’heure qui suit l’envoi. Les admins peuvent toujours supprimer.',
        403
      );
    }
  }

  const wasPinned = await prisma.conversationGroup.findFirst({
    where: { id: groupId, pinned_message_id: messageId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.conversationGroup.updateMany({
      where: { id: groupId, pinned_message_id: messageId },
      data: { pinned_message_id: null },
    });
    await tx.groupMessage.update({
      where: { id: messageId },
      data: {
        is_deleted: true,
        content: '',
        media_url: null,
        thumbnail_url: null,
        reactions: Prisma.JsonNull,
        transcription_text: null,
        poll_options: Prisma.JsonNull,
        poll_votes: Prisma.JsonNull,
        event_id: null,
      },
    });
  });

  emitToGroupRoom(groupId, 'message:updated', {
    messageId,
    groupId,
    is_deleted: true,
    content: '',
    media_url: null,
    thumbnail_url: null,
    reactions: null,
    transcription_text: null,
    poll_options: null,
    poll_votes: null,
    event_id: null,
    event_ref: null,
  });

  if (wasPinned) {
    emitToGroupRoom(groupId, 'group:message-unpinned', { groupId });
  }

  return { success: true, id: messageId };
}

/** CDC — Édition du texte (expéditeur uniquement, messages texte, dans les 15 min). */
const EDIT_GROUP_MESSAGE_WINDOW_MS = 15 * 60 * 1000;

export async function editGroupMessage(groupId: string, messageId: string, userId: string, rawContent: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, is_deleted: false },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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
  if (!msg) throw makeError('Message introuvable', 404);
  if (msg.sender_id !== userId) throw makeError('Seul l’expéditeur peut modifier ce message', 403);
  if (String(msg.type || 'text').toLowerCase() !== 'text') {
    throw makeError('Seuls les messages texte peuvent être modifiés', 400);
  }

  const elapsed = Date.now() - msg.created_at.getTime();
  if (elapsed > EDIT_GROUP_MESSAGE_WINDOW_MS) {
    throw makeError('La modification n’est possible que dans les 15 minutes suivant l’envoi', 400);
  }

  const content = String(rawContent ?? '').trim().slice(0, 10000);
  if (!content) throw makeError('Le contenu texte est requis', 400);

  const updated = await prisma.groupMessage.update({
    where: { id: messageId },
    data: { content, is_edited: true },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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

  const lastGroupMsg = await prisma.groupMessage.findFirst({
    where: { group_id: groupId },
    orderBy: { created_at: 'desc' },
    select: { id: true },
  });
  if (lastGroupMsg?.id === messageId) {
    await prisma.conversationGroup.update({
      where: { id: groupId },
      data: { last_message_text: content.slice(0, 200) },
    });
  }

  const editTags = await buildGroupMemberTagMap(groupId);
  const payload = formatGroupMessagePayload(updated as GroupMsgWithSender, editTags);
  emitToGroupRoom(groupId, 'message:updated', {
    groupId,
    messageId,
    content: updated.content,
    is_edited: true,
  });

  return payload;
}

export async function getGroupMessages(groupId: string, userId: string, cursor: string | null, limit: number = DEFAULT_PAGE_SIZE) {
  const isMember = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!isMember) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const take = Math.min(50, Math.max(1, limit));
  const messages = await prisma.groupMessage.findMany({
    where: {
      group_id: groupId,
      OR: [{ status: { not: 'scheduled' } }, { sender_id: userId }],
    },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > take;
  const list = hasMore ? messages.slice(0, take) : messages;
  const nextCursor = hasMore ? list[list.length - 1]?.id : null;

  const tagMap = await buildGroupMemberTagMap(groupId);
  const visible = list.filter(
    (m) => !isHiddenForUser((m as { hidden_from_user_ids?: unknown }).hidden_from_user_ids, userId),
  );
  return {
    messages: visible.map((m) => formatGroupMessagePayload(m as GroupMsgWithSender, tagMap)),
    nextCursor,
    hasMore: !!nextCursor,
  };
}

/** Masquer un message de groupe « pour moi » (membre du groupe). */
export async function hideGroupMessageForViewer(groupId: string, messageId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId },
    select: { id: true, hidden_from_user_ids: true },
  });
  if (!msg) throw makeError('Message introuvable', 404);

  const nextHidden = withUserInHiddenList(msg.hidden_from_user_ids, userId);
  await prisma.groupMessage.update({
    where: { id: messageId },
    data: { hidden_from_user_ids: nextHidden },
  });
  return { success: true };
}

export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  content: string,
  options: {
    type?: string;
    media_url?: string;
    thumbnail_url?: string;
    reply_to_id?: string | null;
    poll_options?: unknown;
    event_id?: string;
    scheduled_at?: string;
    /** Transfert depuis un message groupe (limite une autre cible si forwardLimit actif). */
    forward_from_message_id?: string | null;
  } = {}
) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: senderId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const forwardRaw =
    options.forward_from_message_id != null && String(options.forward_from_message_id).trim()
      ? String(options.forward_from_message_id).trim()
      : '';
  let forwardFromId: string | null = null;
  if (forwardRaw) {
    const source = await prisma.groupMessage.findFirst({
      where: { id: forwardRaw, is_deleted: false },
      select: { id: true, group_id: true },
    });
    if (!source) throw makeError('Message source du transfert introuvable', 400);
    const srcMembership = await prisma.conversationGroupMember.findFirst({
      where: { group_id: source.group_id, user_id: senderId },
    });
    if (!srcMembership) throw makeError('Transfert non autorisé', 403);
    const prefs = await getMessagingCdcModerationPrefs(senderId);
    if (prefs.forwardLimit) {
      const dup = await prisma.groupMessage.findFirst({
        where: {
          sender_id: senderId,
          forwarded_from_message_id: forwardRaw,
          is_deleted: false,
          group_id: { not: groupId },
        },
        select: { id: true },
      });
      if (dup) {
        throw makeError('Transfert limité : ce message a déjà été envoyé vers un autre groupe.', 400);
      }
    }
    forwardFromId = forwardRaw;
  }

  let scheduledAt: Date | null = null;
  if (options.scheduled_at != null && String(options.scheduled_at).trim()) {
    scheduledAt = new Date(options.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) throw makeError('Date de programmation invalide', 400);
    if (scheduledAt.getTime() <= Date.now()) {
      throw makeError('Choisissez une date et une heure dans le futur', 400);
    }
  }
  const isScheduled = scheduledAt != null;

  const normalizedType = String(options.type || 'text').trim().toLowerCase();

  let replyToId: string | null = null;
  if (options.reply_to_id && String(options.reply_to_id).trim()) {
    const parent = await prisma.groupMessage.findFirst({
      where: { id: String(options.reply_to_id).trim(), group_id: groupId, is_deleted: false },
      select: { id: true },
    });
    if (!parent) throw makeError('Message cité introuvable', 400);
    replyToId = parent.id;
  }

  let createData: {
    group_id: string;
    sender_id: string;
    content: string;
    type: string;
    media_url: string | null;
    thumbnail_url: string | null;
    reply_to_id: string | null;
    poll_options?: Prisma.InputJsonValue;
    poll_votes?: Prisma.InputJsonValue;
    event_id?: string;
  };
  let preview: string;

  if (normalizedType === 'poll') {
    if (options.media_url || options.thumbnail_url) {
      throw makeError('Un sondage ne peut pas inclure de média', 400);
    }
    const question = (content || '').trim().slice(0, GROUP_POLL_MAX_QUESTION_LEN);
    if (!question) throw makeError('Question du sondage requise', 400);
    const pollOpts = normalizePollOptions(options.poll_options);
    if (pollOpts.length < GROUP_POLL_MIN_OPTIONS || pollOpts.length > GROUP_POLL_MAX_OPTIONS) {
      throw makeError(
        `Le sondage doit avoir entre ${GROUP_POLL_MIN_OPTIONS} et ${GROUP_POLL_MAX_OPTIONS} options valides`,
        400
      );
    }
    preview = `📊 ${question.slice(0, 120)}`;
    createData = {
      group_id: groupId,
      sender_id: senderId,
      content: question,
      type: 'poll',
      media_url: null,
      thumbnail_url: null,
      reply_to_id: replyToId,
      poll_options: pollOpts,
      poll_votes: {},
    };
  } else if (normalizedType === 'event') {
    if (options.media_url || options.thumbnail_url) {
      throw makeError('Un événement partagé ne peut pas inclure de média', 400);
    }
    const eid = String(options.event_id || '').trim();
    if (!eid) throw makeError('event_id requis pour partager un événement', 400);
    const ev = await prisma.event.findFirst({
      where: { id: eid },
      select: { id: true, title: true, status: true, organizer_id: true },
    });
    if (!ev) throw makeError('Événement introuvable', 404);
    if (ev.status !== 'published' && ev.organizer_id !== senderId) {
      throw makeError('Cet événement ne peut pas être partagé', 403);
    }
    const shareTitle = maskSensitiveEventTitle(ev.title || '');
    if (!shareTitle) throw makeError('Événement sans titre', 400);
    preview = `📅 ${shareTitle.slice(0, 120)}`;
    createData = {
      group_id: groupId,
      sender_id: senderId,
      content: shareTitle,
      type: 'event',
      media_url: null,
      thumbnail_url: null,
      reply_to_id: replyToId,
      event_id: ev.id,
    };
  } else {
    const text = (content || '').trim().slice(0, 10000);
    if (!text && !options.media_url) throw makeError('Contenu ou média requis', 400);
    if (['image', 'video', 'audio', 'voice', 'file'].includes(normalizedType) && !options.media_url) {
      throw makeError('media_url requis pour ce type de message', 400);
    }
    preview =
      normalizedType === 'image'
        ? 'Image'
        : normalizedType === 'video'
          ? 'Vidéo'
          : normalizedType === 'audio' || normalizedType === 'voice'
            ? 'Message vocal'
            : normalizedType === 'file'
              ? text.slice(0, 80) || 'Document'
              : text.slice(0, 200);
    createData = {
      group_id: groupId,
      sender_id: senderId,
      content: text || (normalizedType === 'file' ? 'Document' : ''),
      type: normalizedType,
      media_url: options.media_url ?? null,
      thumbnail_url: options.thumbnail_url ?? null,
      reply_to_id: replyToId,
    };
  }

  const message = await prisma.groupMessage.create({
    data: {
      ...createData,
      status: isScheduled ? 'scheduled' : 'sent',
      scheduled_at: isScheduled ? scheduledAt : null,
      ...(forwardFromId ? { forwarded_from_message_id: forwardFromId } : {}),
    },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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
    logger.info('Message groupe programmé créé', {
      messageId: message.id,
      groupId,
      scheduled_at: scheduledAt,
    });
    const tagMap = await buildGroupMemberTagMap(groupId);
    const gm = {
      ...(message as unknown as GroupMsgWithSender),
      status: 'scheduled',
      scheduled_at: scheduledAt,
    };
    return formatGroupMessagePayload(gm, tagMap);
  }

  const rawTextForMentions = normalizedType === 'text' ? (content || '').trim().slice(0, 10000) : '';
  return applyGroupMessageDeliverySideEffects(
    groupId,
    senderId,
    message as GroupMsgWithSender & { id: string },
    preview,
    normalizedType,
    rawTextForMentions
  );
}

/** Livre un message groupe programmé (job cron). */
export async function deliverScheduledGroupMessage(messageId: string): Promise<boolean> {
  const row = await prisma.groupMessage.findFirst({
    where: {
      id: messageId,
      status: 'scheduled',
      scheduled_at: { not: null, lte: new Date() },
    },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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
  if (!row) return false;

  const groupId = row.group_id;
  const senderId = row.sender_id;
  const t = String(row.type || 'text').toLowerCase();
  const preview =
    t === 'poll'
      ? `📊 ${(row.content || '').slice(0, 120)}`
      : t === 'event'
        ? `📅 ${(row.content || '').slice(0, 120)}`
        : t === 'image'
          ? 'Image'
          : t === 'video'
            ? 'Vidéo'
            : t === 'audio' || t === 'voice'
              ? 'Message vocal'
              : t === 'file'
                ? (row.content || '').slice(0, 80) || 'Document'
                : (row.content || '').slice(0, 200);

  await prisma.groupMessage.update({
    where: { id: messageId },
    data: { status: 'sent' },
  });

  emitToGroupRoom(groupId, 'message:updated', {
    groupId,
    messageId,
    status: 'sent',
    scheduled_at: null,
  });

  const full = await prisma.groupMessage.findFirst({
    where: { id: messageId },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
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
  if (!full) return false;

  const rawTextForMentions = t === 'text' ? (full.content || '').trim().slice(0, 10000) : '';
  await applyGroupMessageDeliverySideEffects(
    groupId,
    senderId,
    full as GroupMsgWithSender & { id: string },
    preview,
    t,
    rawTextForMentions
  );
  return true;
}

function scheduledGroupPreviewLine(type: string, content: string): string {
  const t = String(type || 'text').toLowerCase();
  const c = (content || '').trim();
  if (t === 'poll') return `📊 ${c.slice(0, 100)}`.trim() || 'Sondage';
  if (t === 'event') return `📅 ${c.slice(0, 100)}`.trim() || 'Événement';
  if (t === 'image') return 'Image';
  if (t === 'video') return 'Vidéo';
  if (t === 'audio' || t === 'voice') return 'Message vocal';
  if (t === 'file') return c.slice(0, 80) || 'Document';
  return c.slice(0, 140) || 'Message';
}

/** Messages de groupe programmés par l’utilisateur (vue centralisée CDC). */
export async function listScheduledGroupMessagesForUser(userId: string) {
  const rows = await prisma.groupMessage.findMany({
    where: {
      sender_id: userId,
      status: 'scheduled',
      scheduled_at: { not: null },
      is_deleted: false,
    },
    select: {
      id: true,
      group_id: true,
      content: true,
      type: true,
      scheduled_at: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { scheduled_at: 'asc' },
    take: 100,
  });
  return rows.map((m) => ({
    channel: 'group' as const,
    message_id: m.id,
    group_id: m.group_id,
    group_name: (m.group?.name || 'Groupe').slice(0, 100),
    scheduled_at: m.scheduled_at!.toISOString(),
    type: m.type,
    preview: scheduledGroupPreviewLine(m.type, m.content),
  }));
}

export async function setGroupMessageReaction(groupId: string, messageId: string, userId: string, emoji: string | null) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, is_deleted: false },
  });
  if (!msg) throw makeError('Message introuvable', 404);

  const prev = (msg.reactions && typeof msg.reactions === 'object' && !Array.isArray(msg.reactions)
    ? (msg.reactions as Record<string, string>)
    : {}) as Record<string, string>;
  const next = { ...prev };
  if (emoji && String(emoji).trim()) {
    next[userId] = String(emoji).trim().slice(0, 16);
  } else {
    delete next[userId];
  }

  const updated = await prisma.groupMessage.update({
    where: { id: messageId },
    data: { reactions: Object.keys(next).length ? next : Prisma.JsonNull },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
  });

  emitToGroupRoom(groupId, 'message:updated', {
    messageId,
    groupId,
    reactions: updated.reactions,
  });

  return updated;
}

/** Vote sur un sondage de groupe (un vote par membre, remplace le précédent). */
export async function voteGroupPoll(groupId: string, messageId: string, userId: string, optionIndexRaw: unknown) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, is_deleted: false, type: 'poll' },
  });
  if (!msg) throw makeError('Sondage introuvable', 404);

  const idx = Number(optionIndexRaw);
  const opts = msg.poll_options;
  const arr = Array.isArray(opts) ? opts.map((x) => String(x)) : [];
  if (!Number.isFinite(idx) || idx !== Math.floor(idx) || idx < 0 || idx >= arr.length) {
    throw makeError('Option invalide', 400);
  }

  let votes: Record<string, number> = {};
  if (msg.poll_votes && typeof msg.poll_votes === 'object' && !Array.isArray(msg.poll_votes)) {
    votes = { ...(msg.poll_votes as Record<string, number>) };
  }
  votes[userId] = idx;

  const updated = await prisma.groupMessage.update({
    where: { id: messageId },
    data: { poll_votes: votes as Prisma.InputJsonValue },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      reply_to: { select: groupMessageReplySelect },
    },
  });

  const tagMap = await buildGroupMemberTagMap(groupId);
  const payload = formatGroupMessagePayload(updated as GroupMsgWithSender, tagMap);

  emitToGroupRoom(groupId, 'message:updated', {
    groupId,
    messageId,
    poll_votes: votes,
  });

  return payload;
}

export async function getGroupMessageReactionsDetail(groupId: string, messageId: string, viewerId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: viewerId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId },
    select: { id: true, reactions: true },
  });
  if (!msg) throw makeError('Message introuvable', 404);

  const map =
    msg.reactions && typeof msg.reactions === 'object' && !Array.isArray(msg.reactions)
      ? (msg.reactions as Record<string, string>)
      : {};
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

/** Transcription Whisper (OPENAI_API_KEY) — message vocal groupe, expéditeur uniquement. */
export async function transcribeGroupVoiceMessage(groupId: string, messageId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const msg = await prisma.groupMessage.findFirst({
    where: { id: messageId, group_id: groupId, sender_id: userId, is_deleted: false },
  });
  if (!msg) throw makeError('Message introuvable', 404);
  const t = String(msg.type || '').toLowerCase();
  if (!['voice', 'audio'].includes(t)) throw makeError('Seuls les messages vocaux sont transcrits', 400);
  if (!msg.media_url) throw makeError('Fichier audio manquant', 400);
  if (msg.transcription_text) return { text: msg.transcription_text, cached: true };

  const audioRes = await fetch(msg.media_url);
  if (!audioRes.ok) throw makeError('Téléchargement audio impossible', 502);
  const buf = Buffer.from(await audioRes.arrayBuffer());

  let text: string;
  try {
    text = await transcribeBufferWithWhisper(buf, { filename: 'voice.webm', mime: 'audio/webm' });
  } catch (e: unknown) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 503) throw makeError(err.message || 'Transcription non configurée', 503);
    logger.warn('Group voice transcription failed', { err: err?.message });
    throw makeError(err.message || 'Échec de la transcription', err.statusCode || 502);
  }

  await prisma.groupMessage.update({
    where: { id: messageId },
    data: { transcription_text: text },
  });

  emitToGroupRoom(groupId, 'message:updated', {
    messageId,
    groupId,
    transcription_text: text,
  });

  return { text, cached: false };
}

export async function addGroupMembers(groupId: string, requesterId: string, userIds: string[]) {
  const requester = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: requesterId },
  });
  if (!requester) throw makeError('Groupe non trouvé ou accès refusé', 404);
  if (requester.role !== 'admin') throw makeError('Seul un admin peut ajouter des membres', 403);

  const existing = await prisma.conversationGroupMember.findMany({
    where: { group_id: groupId },
    select: { user_id: true },
  });
  const existingIds = new Set(existing.map((e) => e.user_id));
  const toAdd = [...new Set(userIds)].filter((id) => !existingIds.has(id));
  if (existing.length + toAdd.length > MAX_GROUP_MEMBERS) throw makeError('Nombre max de membres atteint', 400);

  await prisma.conversationGroupMember.createMany({
    data: toAdd.map((user_id) => ({ group_id: groupId, user_id, role: 'member' })),
  });

  const group = await getGroup(groupId, requesterId);
  return { success: true, group, added: toAdd.length };
}

export async function removeGroupMember(groupId: string, requesterId: string, targetUserId: string) {
  const requester = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: requesterId },
  });
  if (!requester) throw makeError('Groupe non trouvé ou accès refusé', 404);
  const isAdmin = requester.role === 'admin';
  const isSelf = targetUserId === requesterId;
  if (!isAdmin && !isSelf) throw makeError('Non autorisé à retirer ce membre', 403);

  await prisma.conversationGroupMember.deleteMany({
    where: { group_id: groupId, user_id: targetUserId },
  });

  const remaining = await prisma.conversationGroupMember.count({ where: { group_id: groupId } });
  const isSelfLeave = targetUserId === requesterId;
  const silentLeave = isSelfLeave ? (await getMessagingCdcModerationPrefs(targetUserId)).silentLeave : false;
  const shouldBroadcastMemberChange = !isSelfLeave || !silentLeave;
  if (shouldBroadcastMemberChange && remaining > 0) {
    emitToGroupRoom(groupId, 'group:members-updated', { groupId });
  }

  if (remaining === 0) {
    await prisma.conversationGroup.delete({ where: { id: groupId } }).catch(() => {});
  }
  return { success: true, remaining };
}

export async function leaveGroup(groupId: string, userId: string) {
  return removeGroupMember(groupId, userId, userId);
}

/** Libellé affiché à côté du nom dans ce groupe (CDC type WhatsApp) — chaque membre règle le sien. */
export async function setMyGroupDisplayTag(groupId: string, userId: string, rawTag: unknown) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  let tag: string | null = null;
  if (rawTag != null && String(rawTag).trim().length > 0) {
    tag = String(rawTag).trim().slice(0, MAX_GROUP_DISPLAY_TAG_LENGTH);
  }

  await prisma.conversationGroupMember.update({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } },
    data: { group_display_tag: tag },
  });

  emitToGroupRoom(groupId, 'group:members-updated', { groupId });
  return { success: true, group_display_tag: tag };
}

/** Changer le rôle d’un membre (admin / member) — admin uniquement, au moins un admin doit rester. */
export async function setGroupMemberRole(
  groupId: string,
  requesterId: string,
  targetUserId: string,
  role: 'admin' | 'member'
) {
  if (role !== 'admin' && role !== 'member') throw makeError('Rôle invalide', 400);

  const requester = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: requesterId },
  });
  if (!requester || requester.role !== 'admin') throw makeError('Seul un admin peut modifier les rôles', 403);

  const target = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: targetUserId },
  });
  if (!target) throw makeError('Membre introuvable', 404);

  if (target.role === role) {
    return getGroup(groupId, requesterId);
  }

  if (role === 'member' && target.role === 'admin') {
    const adminCount = await prisma.conversationGroupMember.count({
      where: { group_id: groupId, role: 'admin' },
    });
    if (adminCount <= 1) throw makeError('Le groupe doit avoir au moins un administrateur', 400);
  }

  await prisma.conversationGroupMember.update({
    where: { group_id_user_id: { group_id: groupId, user_id: targetUserId } },
    data: { role },
  });

  const group = await getGroup(groupId, requesterId);
  emitToGroupRoom(groupId, 'group:members-updated', { groupId });
  return group;
}

const GROUP_EXPORT_BATCH = 250;

/** Export JSON du fil groupe (membre uniquement) — messages non supprimés, ordre chronologique. */
export async function exportGroupMessages(groupId: string, userId: string) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const group = await prisma.conversationGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, description: true, created_at: true },
  });
  if (!group) throw makeError('Groupe non trouvé', 404);

  const messagesOut: Array<Record<string, unknown>> = [];
  let skip = 0;
  for (;;) {
    const batch = await prisma.groupMessage.findMany({
      where: { group_id: groupId, is_deleted: false },
      include: {
        sender: { select: { id: true, username: true, full_name: true } },
      },
      orderBy: { created_at: 'asc' },
      skip,
      take: GROUP_EXPORT_BATCH,
    });
    if (batch.length === 0) break;
    for (const m of batch) {
      messagesOut.push({
        id: m.id,
        sender_id: m.sender_id,
        sender: m.sender,
        content: m.content,
        type: m.type,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url,
        created_at: m.created_at.toISOString(),
        updated_at: m.updated_at.toISOString(),
        is_edited: m.is_edited,
        reply_to_id: m.reply_to_id,
        event_id: m.event_id,
        poll_options: m.poll_options,
        poll_votes: m.poll_votes,
        transcription_text: m.transcription_text,
        reactions: m.reactions,
        read_by: m.read_by,
      });
    }
    skip += batch.length;
    if (batch.length < GROUP_EXPORT_BATCH) break;
  }

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.created_at.toISOString(),
    },
    exportedAt: new Date().toISOString(),
    messageCount: messagesOut.length,
    messages: messagesOut,
  };
}

/** Nombre max de groupes dans un export agrégé (évite timeouts HTTP sur comptes très chargés). */
const MAX_GROUPS_BULK_EXPORT = 40;

/** Export JSON agrégé : tous les groupes dont l’utilisateur est membre (ordre adhésion la plus récente d’abord, puis tronqué au plafond). */
export async function exportAllUserGroupConversations(userId: string) {
  const members = await prisma.conversationGroupMember.findMany({
    where: { user_id: userId },
    select: { group_id: true },
    orderBy: { joined_at: 'desc' },
  });
  const seen = new Set<string>();
  const orderedGroupIds: string[] = [];
  for (const m of members) {
    if (seen.has(m.group_id)) continue;
    seen.add(m.group_id);
    orderedGroupIds.push(m.group_id);
  }
  const total = orderedGroupIds.length;
  const slice = orderedGroupIds.slice(0, MAX_GROUPS_BULK_EXPORT);
  const groups: Awaited<ReturnType<typeof exportGroupMessages>>[] = [];
  for (const gid of slice) {
    groups.push(await exportGroupMessages(gid, userId));
  }
  return {
    bundleExportedAt: new Date().toISOString(),
    groupsTotal: total,
    groupsExported: groups.length,
    truncated: total > groups.length,
    groups,
  };
}
