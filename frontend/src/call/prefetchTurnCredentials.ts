import apiClient from '../api/client';
import { parseTurnCredentialsResponse, type ParsedTurnCredentials } from './parseTurnCredentialsResponse';

const TTL_MS = 4 * 60 * 1000;

let cache: { at: number; parsed: ParsedTurnCredentials } | null = null;
let inflight: Promise<ParsedTurnCredentials | null> | null = null;

/** Précharge TURN/STUN pour réduire le délai au 1er appel (4G Mali). */
export async function prefetchTurnCredentials(): Promise<ParsedTurnCredentials | null> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.parsed;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiClient.get('/calls/turn-credentials');
      const parsed = parseTurnCredentialsResponse(res.data?.data || res.data);
      cache = { at: Date.now(), parsed };
      return parsed;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function getPrefetchedTurnCredentials(): ParsedTurnCredentials | null {
  if (!cache || Date.now() - cache.at > TTL_MS) return null;
  return cache.parsed;
}
