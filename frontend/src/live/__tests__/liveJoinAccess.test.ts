import { describe, expect, it } from 'vitest';
import { canAccessPrivateLive, liveJoinAccessLabel } from '../liveJoinAccess';

describe('liveJoinAccess', () => {
  it('canAccessPrivateLive — seul allowed', () => {
    expect(canAccessPrivateLive('allowed')).toBe(true);
    expect(canAccessPrivateLive('pending')).toBe(false);
    expect(canAccessPrivateLive('none')).toBe(false);
    expect(canAccessPrivateLive('rejected')).toBe(false);
  });

  it('liveJoinAccessLabel — messages FR', () => {
    expect(liveJoinAccessLabel('pending')).toContain('attente');
    expect(liveJoinAccessLabel('rejected')).toContain('refusé');
    expect(liveJoinAccessLabel('none')).toContain('privé');
  });
});
