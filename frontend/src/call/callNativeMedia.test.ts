import { afterEach, describe, expect, it, vi } from 'vitest';

const g = globalThis as { __AFW_TEST_PLATFORM_OS?: 'web' | 'android' | 'ios' };

const { incallMock } = vi.hoisted(() => ({
  incallMock: {
    start: vi.fn(),
    stop: vi.fn(),
    stopRingback: vi.fn(),
    setSpeakerphoneOn: vi.fn(),
    setForceSpeakerphoneOn: vi.fn(),
  },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
    RESULTS: { GRANTED: 'granted' },
    request: vi.fn(),
  },
}));

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

const androidPlatformMock = () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
    RESULTS: { GRANTED: 'granted' },
    request: vi.fn(),
  },
});

describe('callNativeMedia', () => {
  afterEach(async () => {
    delete g.__AFW_TEST_PLATFORM_OS;
    const { __setInCallManagerLoaderForTests } = await import('./callNativeMedia');
    __setInCallManagerLoaderForTests(null);
  });

  it('startNativeCallAudioSession enables InCallManager ringback for outgoing caller', async () => {
    g.__AFW_TEST_PLATFORM_OS = 'android';
    incallMock.start.mockClear();
    const {
      resetNativeCallAudioSessionForTests,
      startNativeCallAudioSession,
      __setInCallManagerLoaderForTests,
    } = await import('./callNativeMedia');
    __setInCallManagerLoaderForTests(() => incallMock);
    resetNativeCallAudioSessionForTests();
    await startNativeCallAudioSession(false, true, { outgoingRingback: true });
    expect(incallMock.start).toHaveBeenCalledWith({
      media: 'audio',
      auto: true,
      ringback: '_DEFAULT_',
    });
  });

  it('stopNativeOutgoingRingback calls InCallManager.stopRingback', async () => {
    g.__AFW_TEST_PLATFORM_OS = 'android';
    incallMock.stopRingback.mockClear();
    const {
      resetNativeCallAudioSessionForTests,
      startNativeCallAudioSession,
      stopNativeOutgoingRingback,
      __setInCallManagerLoaderForTests,
    } = await import('./callNativeMedia');
    __setInCallManagerLoaderForTests(() => incallMock);
    resetNativeCallAudioSessionForTests();
    await startNativeCallAudioSession(false, true, { outgoingRingback: true });
    await stopNativeOutgoingRingback();
    expect(incallMock.stopRingback).toHaveBeenCalled();
  });

  it('streamHasActiveMediaTracks ignores empty stream', async () => {
    const { streamHasActiveMediaTracks } = await import('./callNativeMedia');
    expect(streamHasActiveMediaTracks({ getTracks: () => [] } as unknown as MediaStream)).toBe(false);
    expect(
      streamHasActiveMediaTracks({
        getTracks: () => [{ readyState: 'live' }],
      } as unknown as MediaStream),
    ).toBe(true);
  });

  it('acquireCallLocalMedia falls back to simpler video constraints', async () => {
    vi.resetModules();
    vi.doMock('react-native', androidPlatformMock);
    const videoTrack = { kind: 'video', readyState: 'live', stop: vi.fn() };
    const audioTrack = { kind: 'audio', readyState: 'live', applyConstraints: vi.fn() };
    const audioStream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      addTrack: vi.fn(),
      getVideoTracks: () => [],
    };
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(audioStream)
      .mockRejectedValueOnce(new DOMException('fail', 'OverconstrainedError'))
      .mockResolvedValueOnce({
        getVideoTracks: () => [videoTrack],
        getTracks: () => [videoTrack],
      });
    const { acquireCallLocalMedia } = await import('./callNativeMedia');
    const result = await acquireCallLocalMedia({
      mediaDevices: { getUserMedia } as unknown as MediaDevices,
      wantVideo: true,
      videoProfile: { width: 640, height: 480, frameRate: 24, label: 'medium', maxBitrate: 500_000 },
    });
    expect(result.videoAcquired).toBe(true);
    expect(audioStream.addTrack).toHaveBeenCalledWith(videoTrack);
    expect(getUserMedia).toHaveBeenCalledTimes(3);
  });

  it('acquireCallLocalMedia continues audio-only when video unavailable', async () => {
    vi.resetModules();
    vi.doMock('react-native', androidPlatformMock);
    const audioTrack = { kind: 'audio', readyState: 'live', applyConstraints: vi.fn() };
    const audioStream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      addTrack: vi.fn(),
      getVideoTracks: () => [],
    };
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(audioStream)
      .mockRejectedValue(new DOMException('Could not start video source', 'NotReadableError'));
    const { acquireCallLocalMedia } = await import('./callNativeMedia');
    const result = await acquireCallLocalMedia({
      mediaDevices: { getUserMedia } as unknown as MediaDevices,
      wantVideo: true,
      videoProfile: { width: 640, height: 480, frameRate: 24, label: 'medium', maxBitrate: 500_000 },
    });
    expect(result.videoAcquired).toBe(false);
    expect(result.stream).toBe(audioStream);
    expect(getUserMedia).toHaveBeenCalledTimes(4);
  });

  it('callMediaErrorMessage maps NotReadableError', async () => {
    const { callMediaErrorMessage } = await import('./callNativeMedia');
    const msg = callMediaErrorMessage(new DOMException('Could not start video source', 'NotReadableError'), true);
    expect(msg).toMatch(/Caméra ou micro indisponible/i);
  });

  it('callMediaErrorMessage maps Firefox NotFoundError to permission hint on web', async () => {
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
        RESULTS: { GRANTED: 'granted' },
        request: vi.fn(),
      },
    }));
    const { callMediaErrorMessage } = await import('./callNativeMedia');
    const msg = callMediaErrorMessage(
      new DOMException('The object can not be found here.', 'NotFoundError'),
      false,
    );
    expect(msg).toMatch(/Paramètres Windows/i);
  });

  it('acquireCallLocalMedia preserves getUserMedia error when enumerateDevices is empty on web', async () => {
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
        RESULTS: { GRANTED: 'granted' },
        request: vi.fn(),
      },
    }));
    Object.defineProperty(globalThis, 'window', {
      value: { isSecureContext: true },
      configurable: true,
    });
    const denied = new DOMException('Permission micro refusée.', 'NotAllowedError');
    const getUserMedia = vi.fn().mockRejectedValue(denied);
    const enumerateDevices = vi.fn(async () => []);
    const { acquireCallLocalMedia } = await import('./callNativeMedia');
    await expect(
      acquireCallLocalMedia({
        mediaDevices: { getUserMedia, enumerateDevices } as unknown as MediaDevices,
        wantVideo: false,
        videoProfile: null,
      }),
    ).rejects.toBe(denied);
  });

  it('acquireCallLocalMedia tries ideal deviceId when generic audio fails on web', async () => {
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
        RESULTS: { GRANTED: 'granted' },
        request: vi.fn(),
      },
    }));
    Object.defineProperty(globalThis, 'window', {
      value: { isSecureContext: true },
      configurable: true,
    });
    const audioTrack = { kind: 'audio', readyState: 'live', applyConstraints: vi.fn() };
    const audioStream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      addTrack: vi.fn(),
      getVideoTracks: () => [],
    };
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('fail', 'NotFoundError'))
      .mockRejectedValueOnce(new DOMException('fail', 'NotFoundError'))
      .mockResolvedValueOnce(audioStream);
    const enumerateDevices = vi.fn(async () => [
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Mic' },
    ]);
    const { acquireCallLocalMedia } = await import('./callNativeMedia');
    const result = await acquireCallLocalMedia({
      mediaDevices: { getUserMedia, enumerateDevices } as unknown as MediaDevices,
      wantVideo: false,
      videoProfile: null,
    });
    expect(result.stream).toBe(audioStream);
    expect(getUserMedia).toHaveBeenCalledTimes(3);
    expect(getUserMedia.mock.calls[2][0]).toMatchObject({
      audio: { deviceId: { ideal: 'mic-1' } },
      video: false,
    });
  });

  it('acquireCallLocalMedia reuses preAcquiredStream without second getUserMedia', async () => {
    vi.resetModules();
    vi.doMock('react-native', androidPlatformMock);
    const audioTrack = { kind: 'audio', readyState: 'live', applyConstraints: vi.fn() };
    const preAcquired = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [],
      addTrack: vi.fn(),
    };
    const getUserMedia = vi.fn();
    const { acquireCallLocalMedia } = await import('./callNativeMedia');
    const result = await acquireCallLocalMedia({
      mediaDevices: { getUserMedia } as unknown as MediaDevices,
      wantVideo: false,
      videoProfile: null,
      preAcquiredStream: preAcquired as unknown as MediaStream,
    });
    expect(result.stream).toBe(preAcquired);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('beginWebCallMediaCapture invokes getUserMedia synchronously', async () => {
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', CAMERA: 'CAMERA' },
        RESULTS: { GRANTED: 'granted' },
        request: vi.fn(),
      },
    }));
    Object.defineProperty(globalThis, 'window', {
      value: { isSecureContext: true },
      configurable: true,
    });
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const { beginWebCallMediaCapture } = await import('./callNativeMedia');
    await beginWebCallMediaCapture({
      mediaDevices: { getUserMedia } as unknown as MediaDevices,
      wantVideo: false,
    });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: false },
        channelCount: { ideal: 1 },
      }),
      video: false,
    });
  });

  it('ensureLocalAudioTracksEnabled active le micro local', async () => {
    const { ensureLocalAudioTracksEnabled } = await import('./callNativeMedia');
    const track = { kind: 'audio', readyState: 'live', enabled: false };
    ensureLocalAudioTracksEnabled({
      getAudioTracks: () => [track],
    } as unknown as MediaStream);
    expect(track.enabled).toBe(true);
  });

  it('peerConnectionHasActiveAudioSender détecte expéditeur audio actif', async () => {
    const { peerConnectionHasActiveAudioSender } = await import('./callNativeMedia');
    expect(
      peerConnectionHasActiveAudioSender({
        getSenders: () => [
          { track: { kind: 'audio', readyState: 'live', enabled: true } },
        ],
      } as unknown as RTCPeerConnection),
    ).toBe(true);
    expect(
      peerConnectionHasActiveAudioSender({
        getSenders: () => [
          { track: { kind: 'audio', readyState: 'live', enabled: false } },
        ],
      } as unknown as RTCPeerConnection),
    ).toBe(false);
  });

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
});
