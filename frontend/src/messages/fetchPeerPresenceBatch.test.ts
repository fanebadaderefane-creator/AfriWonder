import { describe, expect, it, vi } from 'vitest';
import {
  fetchPeerPresenceOnlineMap,
  peerPresenceOnlineMapFromBatchPayload,
} from './fetchPeerPresenceBatch';

describe('peerPresenceOnlineMapFromBatchPayload', () => {
  it('maps online flags from presences object', () => {
    const map = peerPresenceOnlineMapFromBatchPayload(['u1', 'u2', 'u3'], {
      presences: {
        u1: { is_online: true, last_seen: null },
        u2: { is_online: false, last_seen: '2026-01-01T00:00:00.000Z' },
      },
    });
    expect(map.get('u1')).toBe(true);
    expect(map.get('u2')).toBe(false);
    expect(map.get('u3')).toBe(false);
  });
});

describe('fetchPeerPresenceOnlineMap', () => {
  it('posts deduped user ids and returns online map', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          presences: {
            a: { is_online: true },
            b: { is_online: false },
          },
        },
      },
    });
    const map = await fetchPeerPresenceOnlineMap({ post } as never, ['a', 'b', 'a', '']);
    expect(post).toHaveBeenCalledWith('/messages/presence/batch', { userIds: ['a', 'b'] });
    expect(map.get('a')).toBe(true);
    expect(map.get('b')).toBe(false);
  });

  it('returns all false on network error', async () => {
    const post = vi.fn().mockRejectedValue(new Error('429'));
    const map = await fetchPeerPresenceOnlineMap({ post } as never, ['x']);
    expect(map.get('x')).toBe(false);
  });
});
