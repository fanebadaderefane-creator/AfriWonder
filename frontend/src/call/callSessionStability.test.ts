import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const trimMobileAppCaches = vi.fn();
vi.mock('../lib/mobileMemoryMaintenance', () => ({
  trimMobileAppCaches,
}));

describe('callSessionStability', () => {
  beforeEach(() => {
    vi.resetModules();
    trimMobileAppCaches.mockClear();
  });

  it('prepareCallSessionMemory force le trim sur natif', async () => {
    const { prepareCallSessionMemory } = await import('./callSessionStability');
    prepareCallSessionMemory();
    expect(trimMobileAppCaches).toHaveBeenCalledWith('call-screen-enter', { force: true });
  });

  it('releaseCallSessionMemory force le trim sur natif', async () => {
    const { releaseCallSessionMemory } = await import('./callSessionStability');
    releaseCallSessionMemory();
    expect(trimMobileAppCaches).toHaveBeenCalledWith('call-screen-exit', { force: true });
  });
});
