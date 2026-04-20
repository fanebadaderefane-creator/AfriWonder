import { describe, it, expect } from 'vitest';
import type { NetInfoState } from '@react-native-community/netinfo';
import { networkTierFromNetInfo, resolveEffectiveLiveQuality } from './netInfoLiveQuality';

/** Fixtures minimales pour les tests (évite les unions Strict NetInfo très verbeuses). */
function asNetState(s: unknown): NetInfoState {
  return s as NetInfoState;
}

describe('netInfoLiveQuality', () => {
  it('wifi → high tier', () => {
    expect(
      networkTierFromNetInfo(
        asNetState({ type: 'wifi', isConnected: true, isInternetReachable: true }),
      ),
    ).toBe('high');
  });

  it('offline / pas internet → low', () => {
    expect(networkTierFromNetInfo(asNetState({ type: 'wifi', isConnected: false }))).toBe('low');
    expect(
      networkTierFromNetInfo(
        asNetState({ type: 'cellular', isConnected: true, isInternetReachable: false }),
      ),
    ).toBe('low');
  });

  it('cellular 4g → medium', () => {
    expect(
      networkTierFromNetInfo(
        asNetState({
          type: 'cellular',
          isConnected: true,
          isInternetReachable: true,
          details: { cellularGeneration: '4g', isConnectionExpensive: true },
        }),
      ),
    ).toBe('medium');
  });

  it('cellular 5g → high', () => {
    expect(
      networkTierFromNetInfo(
        asNetState({
          type: 'cellular',
          isConnected: true,
          isInternetReachable: true,
          details: { cellularGeneration: '5g', isConnectionExpensive: true },
        }),
      ),
    ).toBe('high');
  });

  it('resolveEffectiveLiveQuality : auto suit le tier', () => {
    expect(resolveEffectiveLiveQuality('auto', 'low')).toBe('360p');
    expect(resolveEffectiveLiveQuality('auto', 'medium')).toBe('540p');
    expect(resolveEffectiveLiveQuality('auto', 'high')).toBe('720p');
    expect(resolveEffectiveLiveQuality('720p', 'low')).toBe('720p');
  });
});
