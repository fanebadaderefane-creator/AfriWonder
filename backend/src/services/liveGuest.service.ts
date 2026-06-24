import prisma from '../config/database.js';
import { getSocketIo } from '../utils/getSocketIo.js';
import { MAX_LIVE_GUEST_SLOTS, nextGuestSlotIndex } from '../utils/liveGuestSlots.js';

function emitGuest(liveId: string, event: string, payload: unknown) {
  const io = getSocketIo();
  if (io) io.to(`stream:${liveId}`).emit(event, payload);
}

export const liveGuestService = {
  async listGuests(liveId: string) {
    const [queue, slots] = await Promise.all([
      prisma.liveGuestQueue.findMany({
        where: { live_id: liveId, status: 'pending' },
        orderBy: [{ position: 'asc' }, { requested_at: 'asc' }],
        take: 50,
      }),
      prisma.liveGuestSlot.findMany({
        where: { live_id: liveId, status: 'active' },
        orderBy: { slot_index: 'asc' },
        include: {
          user: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
      }),
    ]);

    return {
      max_slots: MAX_LIVE_GUEST_SLOTS,
      queue: queue.map((q) => ({
        user_id: q.user_id,
        username: q.username,
        avatar_url: q.avatar_url,
        position: q.position,
        requested_at: q.requested_at,
      })),
      slots: slots.map((s) => ({
        user_id: s.user_id,
        slot_index: s.slot_index,
        username: s.user.full_name || s.user.username,
        avatar_url: s.user.profile_image,
        joined_at: s.joined_at,
      })),
    };
  },

  async requestGuestSlot(liveId: string, userId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!stream || stream.status !== 'live') throw new Error('Live indisponible');
    if (stream.creator_id === userId) throw new Error('Le créateur est déjà à l’antenne');

    const existingSlot = await prisma.liveGuestSlot.findUnique({
      where: { live_id_user_id: { live_id: liveId, user_id: userId } },
    });
    if (existingSlot?.status === 'active') throw new Error('Vous êtes déjà invité à l’écran');

    const pending = await prisma.liveGuestQueue.findUnique({
      where: { live_id_user_id: { live_id: liveId, user_id: userId } },
    });
    if (pending?.status === 'pending') throw new Error('Demande déjà en file d’attente');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, full_name: true, profile_image: true },
    });

    const countPending = await prisma.liveGuestQueue.count({
      where: { live_id: liveId, status: 'pending' },
    });

    const row = await prisma.liveGuestQueue.upsert({
      where: { live_id_user_id: { live_id: liveId, user_id: userId } },
      update: { status: 'pending', position: countPending, requested_at: new Date() },
      create: {
        live_id: liveId,
        user_id: userId,
        username: user?.full_name || user?.username || 'Spectateur',
        avatar_url: user?.profile_image,
        position: countPending,
      },
    });

    const payload = {
      userId,
      username: row.username,
      avatar_url: row.avatar_url,
      position: row.position,
      at: Date.now(),
    };
    emitGuest(liveId, 'live:guest:requested', payload);
    return payload;
  },

  async respondGuestRequest(liveId: string, creatorId: string, targetUserId: string, accept: boolean) {
    const stream = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');

    const req = await prisma.liveGuestQueue.findUnique({
      where: { live_id_user_id: { live_id: liveId, user_id: targetUserId } },
    });
    if (!req || req.status !== 'pending') throw new Error('Demande introuvable');

    if (!accept) {
      await prisma.liveGuestQueue.update({
        where: { id: req.id },
        data: { status: 'rejected', responded_at: new Date() },
      });
      const io = getSocketIo();
      if (io) io.to(`user:${targetUserId}`).emit('live:guest:resolved', { liveId, accepted: false });
      emitGuest(liveId, 'live:guest:resolved', { userId: targetUserId, accepted: false });
      return { accepted: false };
    }

    const activeSlots = await prisma.liveGuestSlot.findMany({
      where: { live_id: liveId, status: 'active' },
      select: { slot_index: true },
    });
    if (activeSlots.length >= MAX_LIVE_GUEST_SLOTS) {
      throw new Error(`Maximum ${MAX_LIVE_GUEST_SLOTS} invités à l’écran.`);
    }

    const slotIndex = nextGuestSlotIndex(activeSlots.map((s) => s.slot_index));
    if (slotIndex == null) throw new Error('Aucune place disponible');

    const slot = await prisma.$transaction(async (tx) => {
      await tx.liveGuestQueue.update({
        where: { id: req.id },
        data: { status: 'accepted', responded_at: new Date() },
      });
      return tx.liveGuestSlot.upsert({
        where: { live_id_user_id: { live_id: liveId, user_id: targetUserId } },
        update: { status: 'active', slot_index: slotIndex, joined_at: new Date() },
        create: { live_id: liveId, user_id: targetUserId, slot_index: slotIndex, status: 'active' },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true, full_name: true, profile_image: true },
    });

    const payload = {
      userId: targetUserId,
      slot_index: slot.slot_index,
      username: user?.full_name || user?.username,
      avatar_url: user?.profile_image,
      accepted: true,
    };

    const io = getSocketIo();
    if (io) {
      io.to(`user:${targetUserId}`).emit('live:guest:accepted', { liveId, ...payload });
      io.to(`user:${targetUserId}`).emit('live:guest:resolved', { liveId, accepted: true });
    }
    emitGuest(liveId, 'live:guest:accepted', payload);
    emitGuest(liveId, 'live:guest:updated', await this.listGuests(liveId));

    return payload;
  },

  async leaveGuestSlot(liveId: string, userId: string) {
    await prisma.liveGuestSlot.updateMany({
      where: { live_id: liveId, user_id: userId },
      data: { status: 'left' },
    });
    await prisma.liveGuestQueue.updateMany({
      where: { live_id: liveId, user_id: userId },
      data: { status: 'left', responded_at: new Date() },
    });
    emitGuest(liveId, 'live:guest:left', { userId });
    emitGuest(liveId, 'live:guest:updated', await this.listGuests(liveId));
    return { ok: true };
  },

  async removeGuestSlot(liveId: string, creatorId: string, targetUserId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: liveId } });
    if (!stream || stream.creator_id !== creatorId) throw new Error('Unauthorized');
    return this.leaveGuestSlot(liveId, targetUserId);
  },

  async isActiveGuest(liveId: string, userId: string): Promise<boolean> {
    const slot = await prisma.liveGuestSlot.findUnique({
      where: { live_id_user_id: { live_id: liveId, user_id: userId } },
    });
    return slot?.status === 'active';
  },
};

export default liveGuestService;
