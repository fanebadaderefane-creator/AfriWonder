import { describe, expect, it } from 'vitest';
import { dedupeRemoteReceiverTracks, mediaStreamBindingKey } from './callRemoteMedia';

describe('callWebAudioPlayback helpers', () => {
  it('mediaStreamBindingKey changes when track readyState changes', () => {
    const track = { id: 'a1', readyState: 'live' };
    const stream = {
      getAudioTracks: () => [track],
      getVideoTracks: () => [],
    };
    expect(mediaStreamBindingKey(stream)).toBe('a1:live');
    track.readyState = 'ended';
    expect(mediaStreamBindingKey(stream)).toBe('a1:ended');
  });

  it('dedupeRemoteReceiverTracks keeps one live audio and one live video', () => {
    const tracks = dedupeRemoteReceiverTracks([
      { id: 'a-old', kind: 'audio', readyState: 'ended' },
      { id: 'a-live', kind: 'audio', readyState: 'live' },
      { id: 'v-live', kind: 'video', readyState: 'live' },
      { id: 'a-dup', kind: 'audio', readyState: 'live' },
    ]);
    expect(tracks.map((t) => t.id)).toEqual(['a-live', 'v-live']);
  });
});
