export type DmRequestState = {
  pending_for_viewer: boolean;
  pending_for_user_id: string | null;
  initiator_user_id: string | null;
  initiator_messages_remaining: number;
  max_messages_before_accept: number;
  initiator_wondered_you: boolean;
  viewer_wonders_initiator: boolean;
};

export type PeerBlockState = {
  viewer_blocked_peer: boolean;
  peer_blocked_viewer: boolean;
};

export function parseDmRequestFromApi(dr: unknown): DmRequestState | null {
  if (!dr || typeof dr !== 'object') return null;
  const o = dr as Record<string, unknown>;
  return {
    pending_for_viewer: !!o.pending_for_viewer,
    pending_for_user_id: typeof o.pending_for_user_id === 'string' ? o.pending_for_user_id : null,
    initiator_user_id: typeof o.initiator_user_id === 'string' ? o.initiator_user_id : null,
    initiator_messages_remaining:
      typeof o.initiator_messages_remaining === 'number' ? o.initiator_messages_remaining : 0,
    max_messages_before_accept:
      typeof o.max_messages_before_accept === 'number' ? o.max_messages_before_accept : 3,
    initiator_wondered_you: !!o.initiator_wondered_you,
    viewer_wonders_initiator: !!o.viewer_wonders_initiator,
  };
}

export function parsePeerBlockFromApi(pb: unknown): PeerBlockState | null {
  if (!pb || typeof pb !== 'object') return null;
  const o = pb as Record<string, unknown>;
  return {
    viewer_blocked_peer: !!o.viewer_blocked_peer,
    peer_blocked_viewer: !!o.peer_blocked_viewer,
  };
}
