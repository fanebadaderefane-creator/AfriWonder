import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveWebBundledSoundUri,
  startPulsedCallRingWeb,
  stopAllWebCallRings,
} from './callRingtoneWeb';

describe('resolveWebBundledSoundUri', () => {
  it('returns string modules as-is', () => {
    expect(resolveWebBundledSoundUri('/assets/incoming_call.wav')).toBe('/assets/incoming_call.wav');
  });

  it('reads uri from asset object', () => {
    expect(resolveWebBundledSoundUri({ uri: 'https://cdn.test/ring.wav' })).toBe('https://cdn.test/ring.wav');
  });
});

describe('startPulsedCallRingWeb', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays and stops HTML audio bursts', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    class MockAudio {
      volume = 1;
      src = '';
      currentTime = 0;
      srcObject: unknown = null;
      play = play;
      pause = pause;
      removeAttribute = vi.fn();
      constructor(public uri: string) {
        this.src = uri;
      }
    }
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

    const stop = startPulsedCallRingWeb(0.5, 'outgoing');
    expect(play).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1200);
    expect(play.mock.calls.length).toBeGreaterThanOrEqual(1);

    await stop();
    expect(pause).toHaveBeenCalled();
  });

  it('stopAllWebCallRings stops every active ring', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    class MockAudio {
      volume = 1;
      src = '';
      currentTime = 0;
      srcObject: unknown = null;
      play = play;
      pause = pause;
      removeAttribute = vi.fn();
      constructor(public uri: string) {
        this.src = uri;
      }
    }
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

    startPulsedCallRingWeb(0.5, 'incoming');
    startPulsedCallRingWeb(0.5, 'outgoing');
    await stopAllWebCallRings();
    expect(pause.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
