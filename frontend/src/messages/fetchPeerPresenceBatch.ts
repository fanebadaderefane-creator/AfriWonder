import type { AxiosInstance } from 'axios';

export type PeerPresenceSnapshot = {
  is_online: boolean;
  last_seen: string | null;
};

/** Parse la réponse API batch présence → map userId → en ligne. */
export function peerPresenceOnlineMapFromBatchPayload(
  userIds: string[],
  payload: unknown,
): Map<string, boolean> {
  const data =
    payload && typeof payload === 'object' && 'presences' in (payload as object)
      ? (payload as { presences?: Record<string, { is_online?: boolean }> }).presences
      : undefined;
  const map = new Map<string, boolean>();
  for (const uid of userIds) {
    map.set(uid, Boolean(data?.[uid]?.is_online));
  }
  return map;
}

/** Présence de plusieurs peers en une requête (inbox). */
export async function fetchPeerPresenceOnlineMap(
  apiClient: AxiosInstance,
  userIds: string[],
): Promise<Map<string, boolean>> {
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  try {
    const res = await apiClient.post('/messages/presence/batch', { userIds: ids });
    const payload = res.data?.data ?? res.data;
    return peerPresenceOnlineMapFromBatchPayload(ids, payload);
  } catch {
    return new Map(ids.map((uid) => [uid, false]));
  }
}
