import { describe, expect, it } from 'vitest';
import {
  isKnownNativeRemoteAudioRefreshSource,
  shouldRefreshNativeRemoteAudioPlayback,
} from './callNativeRemotePlayback';

describe('callNativeRemotePlayback', () => {
  it('shouldRefreshNativeRemoteAudioPlayback — natif actif seulement', () => {
    expect(
      shouldRefreshNativeRemoteAudioPlayback({ isWebRuntime: false, pcTearingDown: false }),
    ).toBe(true);
    expect(
      shouldRefreshNativeRemoteAudioPlayback({ isWebRuntime: true, pcTearingDown: false }),
    ).toBe(false);
    expect(
      shouldRefreshNativeRemoteAudioPlayback({ isWebRuntime: false, pcTearingDown: true }),
    ).toBe(false);
  });

  it('isKnownNativeRemoteAudioRefreshSource', () => {
    expect(isKnownNativeRemoteAudioRefreshSource('ice_connected')).toBe(true);
    expect(isKnownNativeRemoteAudioRefreshSource('unknown')).toBe(false);
  });
});
