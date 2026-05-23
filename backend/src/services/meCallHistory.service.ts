/**
 * Journal d’appels pour l’utilisateur courant — agrège appels 1-1 (DirectCall) et participations salon (GroupCall).
 * Pagination en mémoire sur un échantillon récent (voir takeEach) ; à remplacer par une vue SQL si le volume augmente.
 */
import prisma from '../config/database.js';

const PEER_SELECT = { id: true, username: true, full_name: true, profile_image: true } as const;

export type CallHistoryRow = {
  id: string;
  channel: 'dm' | 'group';
  direction: 'in' | 'out' | 'group';
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  peer?: { id: string; username: string; full_name: string | null; profile_image: string | null };
  group?: { id: string; name: string } | null;
  call_type?: string;
};

export async function listMyCallHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ items: CallHistoryRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  const takeEach = Math.min(150, safeLimit * 6);

  const [directRows, groupParticipants] = await Promise.all([
    prisma.directCall.findMany({
      where: {
        OR: [{ caller_id: userId }, { receiver_id: userId }],
      },
      orderBy: [{ ended_at: 'desc' }, { updated_at: 'desc' }],
      take: takeEach,
    }),
    prisma.groupCallParticipant.findMany({
      where: { user_id: userId },
      include: {
        call: {
          include: {
            conversation_group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
      take: takeEach,
    }),
  ]);

  const peerIds = new Set<string>();
  for (const d of directRows) {
    peerIds.add(d.caller_id === userId ? d.receiver_id : d.caller_id);
  }
  const peers =
    peerIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...peerIds] } },
          select: PEER_SELECT,
        })
      : [];
  const peerMap = new Map(peers.map((u) => [u.id, u]));

  type Sortable = CallHistoryRow & { _sort: number };
  const merged: Sortable[] = [];

  for (const d of directRows) {
    const isOut = d.caller_id === userId;
    const peerId = isOut ? d.receiver_id : d.caller_id;
    const peer = peerMap.get(peerId);
    const ref = d.ended_at ?? d.started_at ?? d.updated_at ?? d.created_at;
    merged.push({
      id: `dm:${d.id}`,
      channel: 'dm',
      direction: isOut ? 'out' : 'in',
      status: d.status,
      started_at: d.started_at?.toISOString() ?? null,
      ended_at: d.ended_at?.toISOString() ?? null,
      duration_sec: d.duration ?? null,
      peer: peer
        ? {
            id: peer.id,
            username: peer.username,
            full_name: peer.full_name,
            profile_image: peer.profile_image,
          }
        : { id: peerId, username: peerId, full_name: null, profile_image: null },
      _sort: ref.getTime(),
    });
  }

  for (const p of groupParticipants) {
    const c = p.call;
    if (!c) continue;
    const ref = c.ended_at ?? c.started_at ?? p.joined_at;
    let durationSec: number | null = null;
    if (c.ended_at && c.started_at) {
      durationSec = Math.max(0, Math.round((c.ended_at.getTime() - c.started_at.getTime()) / 1000));
    } else if (p.left_at) {
      durationSec = Math.max(0, Math.round((p.left_at.getTime() - p.joined_at.getTime()) / 1000));
    }
    merged.push({
      id: `group:${c.id}`,
      channel: 'group',
      direction: 'group',
      status: c.status,
      started_at: c.started_at.toISOString(),
      ended_at: c.ended_at?.toISOString() ?? null,
      duration_sec: durationSec,
      group: c.conversation_group
        ? { id: c.conversation_group.id, name: c.conversation_group.name }
        : null,
      call_type: c.type,
      _sort: ref.getTime(),
    });
  }

  merged.sort((a, b) => b._sort - a._sort);
  const total = merged.length;
  const slice = merged.slice(skip, skip + safeLimit).map(({ _sort, ...row }) => row);

  return {
    items: slice,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}
