import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: { android?: unknown; default?: unknown }) => o.android ?? o.default },
}));

import {
  getDiscoverVideoPrefetchCap,
  getFeedPageLimit,
  getFeedScrollTuning,
  getInboxPollIntervalMs,
  getOfflineAutoWarmAhead,
  getOfflineAutoWarmBehind,
  getOfflineAutoWarmPageCap,
  shouldBootstrapOfflineCacheOnLaunch,
  shouldPreferLowQualityPlayback,
  shouldSkipDiscoverVideoPrefetch,
  shouldBustFeedCacheOnFirstPage,
} from './mobileDataPolicy';

describe('mobileDataPolicy', () => {
  it('réduit la taille de page feed en mode économie', () => {
    expect(getFeedPageLimit(true)).toBeLessThan(getFeedPageLimit(false));
  });

  it('privilégie bas débit sur cellulaire natif', () => {
    expect(shouldPreferLowQualityPlayback(false, true)).toBe(true);
    expect(shouldPreferLowQualityPlayback(false, false)).toBe(false);
  });

  it('ne bust pas le cache feed hors web', () => {
    expect(shouldBustFeedCacheOnFirstPage()).toBe(false);
  });

  it('réduit la fenêtre de rendu feed en mode économie', () => {
    const t = getFeedScrollTuning(true, false);
    expect(t.scrollEventThrottle).toBeLessThanOrEqual(16);
    expect(t.drawDistanceMultiplier).toBeGreaterThanOrEqual(1);
    expect(t.windowSize).toBeLessThanOrEqual(3);
  });

  it('bloque le prefetch vidéo Discover sur forfait', () => {
    expect(shouldSkipDiscoverVideoPrefetch(true, false)).toBe(true);
    expect(shouldSkipDiscoverVideoPrefetch(false, true)).toBe(true);
    expect(getDiscoverVideoPrefetchCap(false, true)).toBe(0);
  });

  it('ralentit le polling inbox sur cellulaire', () => {
    expect(getInboxPollIntervalMs(false, true)).toBeGreaterThan(getInboxPollIntervalMs(false, false));
  });

  it('limite le cache MP4 auto sur forfait (fluidité = 1 vidéo devant)', () => {
    expect(getOfflineAutoWarmAhead(true, true)).toBe(1);
    expect(getOfflineAutoWarmPageCap(true, true)).toBe(1);
    expect(getOfflineAutoWarmBehind(true)).toBe(0);
    expect(getOfflineAutoWarmPageCap(false, true)).toBeLessThanOrEqual(2);
  });

  it('cache modéré sur Wi‑Fi, pas de boot sur cellulaire', () => {
    expect(getOfflineAutoWarmPageCap(false, false)).toBe(6);
    expect(getOfflineAutoWarmAhead(false, false)).toBe(3);
    expect(shouldBootstrapOfflineCacheOnLaunch(true)).toBe(false);
    expect(shouldBootstrapOfflineCacheOnLaunch(false)).toBe(true);
  });
});
