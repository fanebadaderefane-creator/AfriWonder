import { describe, expect, it } from 'vitest';
import { mapLiveDiscoveryStreams } from '../mapLiveDiscoveryStreams';

describe('mapLiveDiscoveryStreams', () => {
  it('mappe streams avec créateur', () => {
    const out = mapLiveDiscoveryStreams({
      streams: [
        {
          id: 'live-1',
          title: 'Concert',
          viewers_count: 1200,
          thumbnail_url: 'https://cdn/thumb.jpg',
          creator: { username: 'dj', profile_image: 'https://cdn/av.jpg' },
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('live-1');
    expect(out[0]?.viewerCount).toBe(1200);
    expect(out[0]?.creatorName).toBe('dj');
  });

  it('ignore entrées sans id', () => {
    expect(mapLiveDiscoveryStreams({ streams: [{ title: 'x' }] })).toHaveLength(0);
  });
});
