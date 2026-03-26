/**
 * Socket pour le lobby d’appel groupe : `user:join` + optionnellement `message:join-group`,
 * et fin d’appel via `user:group-call-ended` (tous les participants) et `group:call-ended` (membres du salon groupe).
 */
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl, getSocketIoTransports } from '@/lib/getSocketBaseUrl';

export function useGroupCallLobbySocket({ userId, groupId, callId, enabled, onCallEnded }) {
  const onCallEndedRef = useRef(onCallEnded);
  onCallEndedRef.current = onCallEnded;

  useEffect(() => {
    if (!enabled || !userId || !callId) return undefined;

    const base = getSocketBaseUrl();
    const socket = io(base, {
      path: '/socket.io',
      transports: getSocketIoTransports(),
      withCredentials: true,
    });

    let endedHandled = false;
    const runEnded = () => {
      if (endedHandled) return;
      endedHandled = true;
      onCallEndedRef.current?.();
    };

    const onConnect = () => {
      socket.emit('user:join', userId);
      if (groupId) socket.emit('message:join-group', groupId);
    };

    const matchCall = (payload) =>
      payload?.callId != null && String(payload.callId) === String(callId);

    socket.on('connect', onConnect);

    socket.on('group:call-ended', (payload) => {
      if (!matchCall(payload)) return;
      runEnded();
    });

    socket.on('user:group-call-ended', (payload) => {
      if (!matchCall(payload)) return;
      runEnded();
    });

    return () => {
      if (groupId) socket.emit('message:leave-group', groupId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, groupId, callId, enabled]);
}
