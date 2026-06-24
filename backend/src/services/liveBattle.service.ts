import prisma from '../config/database.js';
import { getSocketIo } from '../utils/getSocketIo.js';
import notificationService from './notification.service.js';
import {
  applyBattleGiftScore,
  battleRemainingMs,
  battleSideForLive,
  battleWinnerId,
  type LiveBattleSide,
} from '../utils/liveBattleScore.js';

const battleEndTimers = new Map<string, ReturnType<typeof setTimeout>>();

function serializeBattle(b: Record<string, unknown>) {
  return {
    id: b.id,
    status: b.status,
    challenger_id: b.challenger_id,
    opponent_id: b.opponent_id,
    challenger_live_id: b.challenger_live_id,
    opponent_live_id: b.opponent_live_id,
    duration_sec: b.duration_sec,
    challenger_score: b.challenger_score,
    opponent_score: b.opponent_score,
    winner_id: b.winner_id,
    started_at: b.started_at,
    ended_at: b.ended_at,
    remaining_ms: battleRemainingMs(b.started_at as Date | null, Number(b.duration_sec) || 0),
  };
}

function emitBattle(streamIds: string[], event: string, payload: unknown) {
  const io = getSocketIo();
  if (!io) return;
  for (const sid of streamIds) {
    io.to(`stream:${sid}`).emit(event, payload);
  }
}

function scheduleBattleEnd(battleId: string, ms: number) {
  const prev = battleEndTimers.get(battleId);
  if (prev) clearTimeout(prev);
  if (ms <= 0) return;
  battleEndTimers.set(
    battleId,
    setTimeout(() => {
      void liveBattleService.endBattleById(battleId, null).catch(() => {});
    }, ms + 500),
  );
}

export const liveBattleService = {
  async getCurrentForLive(liveId: string) {
    const battle = await prisma.liveBattle.findFirst({
      where: {
        status: { in: ['pending', 'active'] },
        OR: [{ challenger_live_id: liveId }, { opponent_live_id: liveId }],
      },
      orderBy: { created_at: 'desc' },
    });
    if (!battle) return null;
    if (battle.status === 'active' && battle.started_at) {
      const rem = battleRemainingMs(battle.started_at, battle.duration_sec);
      if (rem <= 0) {
        return serializeBattle((await this.endBattleById(battle.id, null)) as Record<string, unknown>);
      }
    }
    return serializeBattle(battle as Record<string, unknown>);
  },

  async challenge(
    userId: string,
    challengerLiveId: string,
    opponentLiveId: string,
    durationSec = 180,
  ) {
    const challengerLive = await prisma.liveStream.findUnique({ where: { id: challengerLiveId } });
    const opponentLive = await prisma.liveStream.findUnique({ where: { id: opponentLiveId } });
    if (!challengerLive || challengerLive.creator_id !== userId) throw new Error('Unauthorized');
    if (!opponentLive || opponentLive.status !== 'live') throw new Error('Live adversaire introuvable ou terminé');
    if (challengerLive.status !== 'live') throw new Error('Votre live doit être en direct');
    if (challengerLiveId === opponentLiveId) throw new Error('Impossible de défier votre propre live');

    const existing = await prisma.liveBattle.findFirst({
      where: {
        status: { in: ['pending', 'active'] },
        OR: [
          { challenger_live_id: challengerLiveId },
          { opponent_live_id: challengerLiveId },
          { challenger_live_id: opponentLiveId },
          { opponent_live_id: opponentLiveId },
        ],
      },
    });
    if (existing) throw new Error('Un battle est déjà en cours ou en attente');

    const dur = Math.min(600, Math.max(60, Math.floor(durationSec)));

    const battle = await prisma.liveBattle.create({
      data: {
        challenger_id: userId,
        opponent_id: opponentLive.creator_id,
        challenger_live_id: challengerLiveId,
        opponent_live_id: opponentLiveId,
        duration_sec: dur,
        status: 'pending',
      },
    });

    const payload = serializeBattle(battle as Record<string, unknown>);
    const io = getSocketIo();
    if (io) {
      io.to(`user:${opponentLive.creator_id}`).emit('battle:proposed', payload);
      io.to(`stream:${opponentLiveId}`).emit('battle:proposed', payload);
    }

    try {
      await notificationService.create(opponentLive.creator_id, {
        type: 'live_battle_challenge',
        title: 'Défi Battle Live',
        message: `${challengerLive.creator_name || 'Un créateur'} vous défie en battle !`,
        reference_type: 'live',
        reference_id: opponentLiveId,
      });
    } catch {
      /* ignore */
    }

    return payload;
  },

  async acceptBattle(liveId: string, userId: string) {
    const battle = await prisma.liveBattle.findFirst({
      where: {
        opponent_live_id: liveId,
        opponent_id: userId,
        status: 'pending',
      },
      orderBy: { created_at: 'desc' },
    });
    if (!battle) throw new Error('Aucun défi battle en attente');

    const started = await prisma.liveBattle.update({
      where: { id: battle.id },
      data: { status: 'active', started_at: new Date() },
    });

    const payload = serializeBattle(started as Record<string, unknown>);
    emitBattle([battle.challenger_live_id, battle.opponent_live_id], 'battle:started', payload);
    scheduleBattleEnd(battle.id, battle.duration_sec * 1000);

    return payload;
  },

  async declineBattle(liveId: string, userId: string) {
    const battle = await prisma.liveBattle.findFirst({
      where: { opponent_live_id: liveId, opponent_id: userId, status: 'pending' },
    });
    if (!battle) throw new Error('Aucun défi en attente');

    const updated = await prisma.liveBattle.update({
      where: { id: battle.id },
      data: { status: 'declined', ended_at: new Date() },
    });

    const payload = serializeBattle(updated as Record<string, unknown>);
    emitBattle([battle.challenger_live_id, battle.opponent_live_id], 'battle:ended', payload);
    return payload;
  },

  async endBattleById(battleId: string, userId: string | null) {
    const battle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    if (!battle || battle.status === 'ended' || battle.status === 'declined') return battle;

    if (userId && userId !== battle.challenger_id && userId !== battle.opponent_id) {
      throw new Error('Unauthorized');
    }

    const winner = battleWinnerId(
      battle.challenger_id,
      battle.opponent_id,
      battle.challenger_score,
      battle.opponent_score,
    );

    const updated = await prisma.liveBattle.update({
      where: { id: battleId },
      data: { status: 'ended', ended_at: new Date(), winner_id: winner },
    });

    battleEndTimers.delete(battleId);
    const payload = serializeBattle(updated as Record<string, unknown>);
    emitBattle([battle.challenger_live_id, battle.opponent_live_id], 'battle:ended', payload);
    return payload;
  },

  async endBattleForLive(liveId: string, userId: string) {
    const battle = await prisma.liveBattle.findFirst({
      where: {
        status: 'active',
        OR: [{ challenger_live_id: liveId }, { opponent_live_id: liveId }],
      },
    });
    if (!battle) throw new Error('Aucun battle actif');
    return this.endBattleById(battle.id, userId);
  },

  async applyGiftScore(liveId: string, side: LiveBattleSide, amountFcfa: number) {
    const battle = await prisma.liveBattle.findFirst({
      where: {
        status: 'active',
        OR: [{ challenger_live_id: liveId }, { opponent_live_id: liveId }],
      },
    });
    if (!battle) return null;

    const resolvedSide = side || battleSideForLive(battle, liveId);
    if (!resolvedSide) return null;

    const next = applyBattleGiftScore(
      { challenger: battle.challenger_score, opponent: battle.opponent_score },
      resolvedSide,
      amountFcfa,
    );

    const updated = await prisma.liveBattle.update({
      where: { id: battle.id },
      data: { challenger_score: next.challenger, opponent_score: next.opponent },
    });

    const payload = serializeBattle(updated as Record<string, unknown>);
    emitBattle([battle.challenger_live_id, battle.opponent_live_id], 'battle:score-update', payload);
    return payload;
  },
};

export default liveBattleService;
