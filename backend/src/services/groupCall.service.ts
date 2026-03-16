import crypto from 'crypto';
import prisma from '../config/database.js';

function makeError(message: string, statusCode: number): Error & { statusCode?: number } {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  return err;
}

class GroupCallService {
  async create(creatorId: string, type: 'audio' | 'video' = 'video') {
    const roomId = `gc_${crypto.randomBytes(12).toString('hex')}`;
    const call = await prisma.groupCall.create({
      data: {
        creator_id: creatorId,
        room_id: roomId,
        type,
        status: 'active',
      },
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    await prisma.groupCallParticipant.create({
      data: { call_id: call.id, user_id: creatorId, role: 'host' },
    });
    return call;
  }

  async join(callId: string, userId: string) {
    const call = await prisma.groupCall.findUnique({
      where: { id: callId },
      include: { participants: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } } },
    });
    if (!call) throw makeError('Appel non trouvé', 404);
    if (call.status !== 'active') throw makeError('Appel terminé', 400);
    const existing = await prisma.groupCallParticipant.findUnique({
      where: { call_id_user_id: { call_id: callId, user_id: userId } },
    });
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
      await prisma.groupCall.update({
        where: { id: callId },
        data: { status: 'ended', ended_at: new Date() },
      });
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
}

export default new GroupCallService();
