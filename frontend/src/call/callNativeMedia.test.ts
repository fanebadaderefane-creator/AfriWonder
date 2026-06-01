import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
    RESULTS: { GRANTED: 'granted' },
    request: vi.fn(),
  },
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
    const fakeDevices = { getUserMedia: vi.fn() } as unknown as MediaDevices;
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: fakeDevices },
      configurable: true,
    });
    const { resolveWebRtcMediaDevices } = await import('./callNativeMedia');
    expect(resolveWebRtcMediaDevices()).toBe(fakeDevices);
  });
});
