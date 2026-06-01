import { describe, expect, it } from 'vitest';
import {
  countLocalTracks,
  shouldMarkCallConnected,
  streamHasLiveAudio,
} from './callRemoteMedia';

describe('callRemoteMedia', () => {
  it('streamHasLiveAudio détecte une piste audio active', () => {
    expect(
      streamHasLiveAudio({
        getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
      }),
    ).toBe(true);
    expect(
      streamHasLiveAudio({
        getAudioTracks: () => [{ enabled: false, readyState: 'live' }],
      }),
    ).toBe(false);
  });

  it('shouldMarkCallConnected exige une piste audio distante', () => {
    expect(
      shouldMarkCallConnected({
        trackKind: 'video',
        stream: { getAudioTracks: () => [] },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        trackKind: 'audio',
        stream: { getAudioTracks: () => [] },
      }),
    ).toBe(true);
    expect(
      shouldMarkCallConnected({
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(true);
  });

  it('countLocalTracks compte audio et vidéo', () => {
    expect(
      countLocalTracks({
        getAudioTracks: () => [{}],
        getVideoTracks: () => [{}, {}],
      }),
    ).toEqual({ audio: 1, video: 2 });
  });
});
