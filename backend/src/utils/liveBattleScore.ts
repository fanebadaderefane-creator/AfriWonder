/** Score battle + détection fin de round (logique pure — tests sans DB). */
export type LiveBattleSide = 'challenger' | 'opponent';

export function applyBattleGiftScore(
  scores: { challenger: number; opponent: number },
  side: LiveBattleSide,
  amountFcfa: number,
): { challenger: number; opponent: number } {
  const amt = Math.max(0, Number(amountFcfa) || 0);
  if (side === 'challenger') return { challenger: scores.challenger + amt, opponent: scores.opponent };
  return { challenger: scores.challenger, opponent: scores.opponent + amt };
}

export function battleWinnerId(
  challengerId: string,
  opponentId: string,
  challengerScore: number,
  opponentScore: number,
): string | null {
  if (challengerScore > opponentScore) return challengerId;
  if (opponentScore > challengerScore) return opponentId;
  return null;
}

export function battleRemainingMs(startedAt: Date | null, durationSec: number, nowMs = Date.now()): number {
  if (!startedAt || durationSec <= 0) return 0;
  const end = startedAt.getTime() + durationSec * 1000;
  return Math.max(0, end - nowMs);
}

export function battleSideForLive(
  battle: { challenger_live_id: string; opponent_live_id: string },
  liveId: string,
): LiveBattleSide | null {
  if (battle.challenger_live_id === liveId) return 'challenger';
  if (battle.opponent_live_id === liveId) return 'opponent';
  return null;
}
