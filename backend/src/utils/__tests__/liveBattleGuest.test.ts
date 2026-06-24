import { describe, expect, it } from '@jest/globals';
import {
  applyBattleGiftScore,
  battleRemainingMs,
  battleSideForLive,
  battleWinnerId,
} from '../liveBattleScore.js';
import { MAX_LIVE_GUEST_SLOTS, nextGuestSlotIndex } from '../liveGuestSlots.js';

describe('liveBattleScore', () => {
  it('adds score on correct side', () => {
    const next = applyBattleGiftScore({ challenger: 100, opponent: 50 }, 'opponent', 200);
    expect(next).toEqual({ challenger: 100, opponent: 250 });
  });

  it('picks winner', () => {
    expect(battleWinnerId('a', 'b', 300, 100)).toBe('a');
    expect(battleWinnerId('a', 'b', 100, 100)).toBeNull();
  });

  it('resolves side from live id', () => {
    expect(
      battleSideForLive({ challenger_live_id: 'L1', opponent_live_id: 'L2' }, 'L2'),
    ).toBe('opponent');
  });

  it('computes remaining ms', () => {
    const started = new Date('2026-06-16T12:00:00Z');
    const now = started.getTime() + 60_000;
    expect(battleRemainingMs(started, 180, now)).toBe(120_000);
  });
});

describe('liveGuestSlots', () => {
  it('finds first free slot', () => {
    expect(nextGuestSlotIndex([0, 2])).toBe(1);
    expect(nextGuestSlotIndex(Array.from({ length: MAX_LIVE_GUEST_SLOTS }, (_, i) => i))).toBeNull();
  });
});
