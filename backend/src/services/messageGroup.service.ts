/**
 * Service messagerie groupes — CDC Super-App AfriWonder.
 * Création de groupes, envoi de messages, gestion des membres.
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const DEFAULT_PAGE_SIZE = 30;
const MAX_GROUP_MEMBERS = 256;
const MAX_GROUP_NAME_LENGTH = 100;

function makeError(message: string, statusCode: number): Error & { statusCode?: number } {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  return err;
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

  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      avatar_url: g.avatar_url,
      created_by_id: g.created_by_id,
      last_message_at: g.last_message_at,
      last_message_text: g.last_message_text,
      created_at: g.created_at,
      members_count: g.members.length,
      members: g.members.map((m) => ({ ...m.user, role: m.role })),
      created_by: g.created_by,
    })),
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
        },
      },
    },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);
  const g = member.group;
  return {
    id: g.id,
    name: g.name,
    avatar_url: g.avatar_url,
    created_by_id: g.created_by_id,
    created_at: g.created_at,
    last_message_at: g.last_message_at,
    last_message_text: g.last_message_text,
    members: g.members.map((m) => ({ ...m.user, role: m.role })),
    created_by: g.created_by,
  };
}

export async function getGroupMessages(groupId: string, userId: string, cursor: string | null, limit: number = DEFAULT_PAGE_SIZE) {
  const isMember = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: userId },
  });
  if (!isMember) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const take = Math.min(50, Math.max(1, limit));
  const messages = await prisma.groupMessage.findMany({
    where: { group_id: groupId, is_deleted: false },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
    orderBy: { created_at: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > take;
  const list = hasMore ? messages.slice(0, take) : messages;
  const nextCursor = hasMore ? list[list.length - 1]?.id : null;

  return {
    messages: list.map((m) => ({
      id: m.id,
      group_id: m.group_id,
      sender_id: m.sender_id,
      sender: m.sender,
      content: m.content,
      type: m.type,
      media_url: m.media_url,
      thumbnail_url: m.thumbnail_url,
      created_at: m.created_at,
      is_deleted: m.is_deleted,
    })),
    nextCursor,
    hasMore: !!nextCursor,
  };
}

export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  content: string,
  options: { type?: string; media_url?: string; thumbnail_url?: string } = {}
) {
  const member = await prisma.conversationGroupMember.findFirst({
    where: { group_id: groupId, user_id: senderId },
  });
  if (!member) throw makeError('Groupe non trouvé ou accès refusé', 404);

  const text = (content || '').trim().slice(0, 10000);
  if (!text && !options.media_url) throw makeError('Contenu ou média requis', 400);

  const message = await prisma.groupMessage.create({
    data: {
      group_id: groupId,
      sender_id: senderId,
      content: text || '',
      type: options.type || 'text',
      media_url: options.media_url,
      thumbnail_url: options.thumbnail_url,
    },
    include: {
      sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
  });

  await prisma.conversationGroup.update({
    where: { id: groupId },
    data: {
      last_message_at: message.created_at,
      last_message_text: text.slice(0, 200),
      updated_at: message.created_at,
    },
  });

  return {
    id: message.id,
    group_id: message.group_id,
    sender_id: message.sender_id,
    sender: message.sender,
    content: message.content,
    type: message.type,
    media_url: message.media_url,
    thumbnail_url: message.thumbnail_url,
    created_at: message.created_at,
  };
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
  if (remaining === 0) {
    await prisma.conversationGroup.delete({ where: { id: groupId } }).catch(() => {});
  }
  return { success: true, remaining };
}

export async function leaveGroup(groupId: string, userId: string) {
  return removeGroupMember(groupId, userId, userId);
}
