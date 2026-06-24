import { useEffect, useRef } from 'react';
import apiClient from '../api/client';

const HEARTBEAT_MS = 25_000;

/** Join déjà géré par l’écran ; ici heartbeat + leave propre à la sortie. */
export function useLiveViewerSession(opts: {
  liveId: string | null;
  sessionId: string;
  enabled: boolean;
}) {
  const { liveId, sessionId, enabled } = opts;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useEffect(() => {
    if (!enabled || !liveId) return;

    const id = liveId;
    const sid = sessionIdRef.current;

    const tick = () => {
      void apiClient.post(`/live/${encodeURIComponent(id)}/heartbeat`, { sessionId: sid }).catch(() => {});
    };

    tick();
    const interval = setInterval(tick, HEARTBEAT_MS);

    return () => {
      clearInterval(interval);
      void apiClient.post(`/live/${encodeURIComponent(id)}/leave`, { sessionId: sid }).catch(() => {});
    };
  }, [enabled, liveId, sessionId]);
}
