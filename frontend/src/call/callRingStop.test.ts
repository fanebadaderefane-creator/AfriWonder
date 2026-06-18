import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./callRingtone', () => ({
  stopAllCallRings: vi.fn(async () => {}),
}));

vi.mock('./callNativeMedia', () => ({
  stopNativeOutgoingRingback: vi.fn(async () => {}),
  stopNativeCallAudioSession: vi.fn(async () => {}),
}));

import { stopEveryCallRingAlert } from './callRingStop';
import { stopAllCallRings } from './callRingtone';
import { stopNativeCallAudioSession, stopNativeOutgoingRingback } from './callNativeMedia';

describe('stopEveryCallRingAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('coupe expo-av, ringback InCallManager et session native', async () => {
    await stopEveryCallRingAlert();
    expect(stopAllCallRings).toHaveBeenCalledTimes(1);
    expect(stopNativeOutgoingRingback).toHaveBeenCalledTimes(1);
    expect(stopNativeCallAudioSession).toHaveBeenCalledTimes(1);
  });
});
