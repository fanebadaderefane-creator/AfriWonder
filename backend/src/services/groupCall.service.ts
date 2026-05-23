import crypto from 'crypto';
import prisma from '../config/database.js';
import { emitToGroupRoom, emitToManyUserRooms } from './message.service.js';

function makeError(message: string, statusCode: number): Error & { statusCode?: number } {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  return err;
}

class GroupCallService {
  async create(
    creatorId: string,
    type: 'audio' | 'video' = 'video',
    options?: { conversation_group_id?: string | null }
  ) {
    const gid = options?.conversation_group_id ? String(options.conversation_group_id).trim() : '';
    if (gid) {
      const member = await prisma.conversationGroupMember.findUnique({
        where: { group_id_user_id: { group_id: gid, user_id: creatorId } },
      });
      if (!member) throw makeError('Vous n’êtes pas membre de ce groupe', 403);
    }

    const roomId = `gc_${crypto.randomBytes(12).toString('hex')}`;
    const call = await prisma.groupCall.create({
      data: {
        creator_id: creatorId,
        room_id: roomId,
        type,
        status: 'active',
        ...(gid ? { conversation_group_id: gid } : {}),
      },
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    await prisma.groupCallParticipant.create({
      data: { call_id: call.id, user_id: creatorId, role: 'host' },
    });

    if (gid) {
      const name = call.creator?.full_name || call.creator?.username || 'Un membre';
      const invitePayload = {
        groupId: gid,
        callId: call.id,
        roomId: call.room_id,
        type: call.type,
        startedBy: creatorId,
        startedByName: name,
      };
      const members = await prisma.conversationGroupMember.findMany({
        where: { group_id: gid },
        select: { user_id: true },
      });
      const inviteTargets = members.map((m) => m.user_id).filter((uid) => uid && uid !== creatorId);
      emitToManyUserRooms(inviteTargets, 'group:call-invite', invitePayload);
    }

    return call;
  }

  async join(callId: string, userId: string) {
    const call = await prisma.groupCall.findUnique({
      where: { id: callId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, full_name: true, profile_image: true },
            },
          },
        },
      },
    });
    if (!call) throw makeError('Appel non trouvé', 404);
    if (call.status !== 'active') throw makeError('Appel terminé', 400);
    const existing = await prisma.groupCallParticipant.findUnique({
      where: { call_id_user_id: { call_id: callId, user_id: userId } },
    });
    if (existing?.left_at != null) {
      await prisma.groupCallParticipant.update({
        where: { id: existing.id },
        data: { left_at: null },
      });
      const participant = await prisma.groupCallParticipant.findUnique({
        where: { id: existing.id },
        include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
      });
      return { call, participant: participant!, joined: true };
    }
    if (existing) return { call, participant: existing, joined: false };
    const participant = await prisma.groupCallParticipant.create({
      data: { call_id: callId, user_id: userId, role: 'participant' },
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    return { call, participant, joined: true };
  }

  async leave(callId: string, userId: string) {
    const p = await prisma.groupCallParticipant.findFirst({
      where: { call_id: callId, user_id: userId },
    });
    if (!p) throw makeError('Participant non trouvé', 404);
    await prisma.groupCallParticipant.update({
      where: { id: p.id },
      data: { left_at: new Date() },
    });
    const remaining = await prisma.groupCallParticipant.count({
      where: { call_id: callId, left_at: null },
    });
    if (remaining === 0) {
      const ended = await prisma.groupCall.update({
        where: { id: callId },
        data: { status: 'ended', ended_at: new Date() },
        select: { conversation_group_id: true },
      });
      const participantRows = await prisma.groupCallParticipant.findMany({
        where: { call_id: callId },
        select: { user_id: true },
      });
      const userIds = [...new Set(participantRows.map((r) => r.user_id))];
      emitToManyUserRooms(userIds, 'user:group-call-ended', {
        callId,
        groupId: ended.conversation_group_id ?? null,
      });
      if (ended.conversation_group_id) {
        emitToGroupRoom(ended.conversation_group_id, 'group:call-ended', {
          groupId: ended.conversation_group_id,
          callId,
        });
      }
    }
    return { left: true };
  }

  async getByRoomId(roomId: string) {
    const call = await prisma.groupCall.findFirst({
      where: { room_id: roomId },
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
        participants: {
          where: { left_at: null },
          include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
        },
      },
    });
    return call;
  }

  async getById(callId: string) {
    const call = await prisma.groupCall.findUnique({
      where: { id: callId },
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
        participants: {
          where: { left_at: null },
          include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
        },
      },
    });
    return call;
  }

  /** Participant actif (left_at null) requis pour token média */
  async assertActiveParticipant(callId: string, userId: string) {
    const call = await prisma.groupCall.findUnique({ where: { id: callId } });
    if (!call) throw makeError('Appel non trouvé', 404);
    if (call.status !== 'active') throw makeError('Appel terminé', 400);
    const p = await prisma.groupCallParticipant.findFirst({
      where: { call_id: callId, user_id: userId, left_at: null },
    });
    if (!p) throw makeError('Vous ne participez pas à cet appel', 403);
    return { call, participant: p };
  }
}

export default new GroupCallService();
