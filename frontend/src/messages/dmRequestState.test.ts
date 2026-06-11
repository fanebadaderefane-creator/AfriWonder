import { describe, expect, it } from 'vitest';
import { parseDmRequestFromApi, parsePeerBlockFromApi } from './dmRequestState';

describe('dmRequestState', () => {
  it('parseDmRequestFromApi inclut wonder', () => {
    const parsed = parseDmRequestFromApi({
      pending_for_viewer: true,
      pending_for_user_id: 'u1',
      initiator_user_id: 'u2',
      initiator_messages_remaining: 2,
      max_messages_before_accept: 3,
      initiator_wondered_you: true,
      viewer_wonders_initiator: false,
    });
    expect(parsed?.initiator_wondered_you).toBe(true);
    expect(parsed?.viewer_wonders_initiator).toBe(false);
  });

  it('parsePeerBlockFromApi', () => {
    expect(parsePeerBlockFromApi({ viewer_blocked_peer: true, peer_blocked_viewer: false })).toEqual({
      viewer_blocked_peer: true,
      peer_blocked_viewer: false,
    });
  });
});
