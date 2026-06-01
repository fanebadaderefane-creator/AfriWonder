import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
    RESULTS: { GRANTED: 'granted' },
    request: vi.fn(),
  },
}));

const incallMock = {
  start: vi.fn(),
  stop: vi.fn(),
  stopRingback: vi.fn(),
  setSpeakerphoneOn: vi.fn(),
  setForceSpeakerphoneOn: vi.fn(),
};

vi.mock('react-native-incall-manager', () => ({
  default: incallMock,
}));

vi.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: vi.fn(async () => ({ granted: true })),
}));

vi.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
    setIsEnabledAsync: vi.fn(async () => {}),
    setAudioModeAsync: vi.fn(async () => {}),
  },
  InterruptionModeAndroid: { DoNotMix: 1 },
  InterruptionModeIOS: { DoNotMix: 1 },
}));

vi.mock('./tryLoadReactNativeWebRtc', () => ({
  tryLoadReactNativeWebRtc: () => null,
}));

describe('callNativeMedia', () => {
  it('resolveWebRtcMediaDevices uses navigator on web', async () => {
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
        RESULTS: { GRANTED: 'granted' },
        request: vi.fn(),
      },
    }));
    const fakeDevices = { getUserMedia: vi.fn() } as unknown as MediaDevices;
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: fakeDevices },
      configurable: true,
    });
    const { resolveWebRtcMediaDevices } = await import('./callNativeMedia');
    expect(resolveWebRtcMediaDevices()).toBe(fakeDevices);
  });

  it('startNativeCallAudioSession enables InCallManager ringback for outgoing caller', async () => {
    vi.resetModules();
    incallMock.start.mockClear();
    const { startNativeCallAudioSession } = await import('./callNativeMedia');
    await startNativeCallAudioSession(false, true, { outgoingRingback: true });
    expect(incallMock.start).toHaveBeenCalledWith({
      media: 'audio',
      auto: true,
      ringback: '_DEFAULT_',
    });
  });

  it('stopNativeOutgoingRingback calls InCallManager.stopRingback', async () => {
    vi.resetModules();
    incallMock.stopRingback.mockClear();
    const { stopNativeOutgoingRingback } = await import('./callNativeMedia');
    await stopNativeOutgoingRingback();
    expect(incallMock.stopRingback).toHaveBeenCalled();
  });
});
