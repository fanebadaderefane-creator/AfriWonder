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
  getOfflineAutoWarmPageCap,
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

  it('pré-cache auto hors ligne sans intervention utilisateur', () => {
    expect(getOfflineAutoWarmPageCap(false, false)).toBeGreaterThanOrEqual(16);
    expect(getOfflineAutoWarmAhead(false, true)).toBeGreaterThan(0);
  });
});
