export type LiveBattleState = {
  id: string;
  status: 'pending' | 'active' | 'ended' | 'declined' | string;
  challenger_id: string;
  opponent_id: string;
  challenger_live_id: string;
  opponent_live_id: string;
  duration_sec: number;
  challenger_score: number;
  opponent_score: number;
  winner_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  remaining_ms?: number;
};

export type LiveBattleSide = 'challenger' | 'opponent';

export function battleSideForViewer(battle: LiveBattleState, liveId: string): LiveBattleSide | null {
  if (battle.challenger_live_id === liveId) return 'challenger';
  if (battle.opponent_live_id === liveId) return 'opponent';
  return null;
}

export function opponentLiveIdFor(battle: LiveBattleState, liveId: string): string | null {
  if (battle.challenger_live_id === liveId) return battle.opponent_live_id;
  if (battle.opponent_live_id === liveId) return battle.challenger_live_id;
  return null;
}
