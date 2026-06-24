import { describe, expect, it } from 'vitest';
import { battleSideForViewer, opponentLiveIdFor } from '../liveBattleTypes';

describe('liveBattleTypes', () => {
  const battle = {
    id: 'b1',
    status: 'active' as const,
    challenger_id: 'u1',
    opponent_id: 'u2',
    challenger_live_id: 'L1',
    opponent_live_id: 'L2',
    duration_sec: 180,
    challenger_score: 0,
    opponent_score: 0,
  };

  it('resolves viewer side', () => {
    expect(battleSideForViewer(battle, 'L1')).toBe('challenger');
    expect(opponentLiveIdFor(battle, 'L1')).toBe('L2');
  });
});
