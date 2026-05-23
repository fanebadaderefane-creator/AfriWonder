import { useEffect, useRef } from 'react';
import { getSocketBaseUrl } from '@/lib/getSocketBaseUrl';
import { createSocket } from '@/lib/socketConfig';

export function useCallSocket({
  userId,
  onInvite,
  onAccept,
  onDecline,
  onMissed,
  onEnd,
  onSignal,
  onGroupCallInvite,
  onGroupCallEnded,
} = {}) {
  const socketRef = useRef(null);
  const pendingEmitsRef = useRef([]);
  const inviteRef = useRef(onInvite);
  const acceptRef = useRef(onAccept);
  const declineRef = useRef(onDecline);
  const missedRef = useRef(onMissed);
  const endRef = useRef(onEnd);
  const signalRef = useRef(onSignal);
  const groupCallInviteRef = useRef(onGroupCallInvite);
  const groupCallEndedRef = useRef(onGroupCallEnded);

  inviteRef.current = onInvite;
  acceptRef.current = onAccept;
  declineRef.current = onDecline;
  missedRef.current = onMissed;
  endRef.current = onEnd;
  signalRef.current = onSignal;
  groupCallInviteRef.current = onGroupCallInvite;
  groupCallEndedRef.current = onGroupCallEnded;

  useEffect(() => {
    if (!userId) return;
    const base = getSocketBaseUrl();
    const socket = createSocket(base);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:join', userId);
      if (pendingEmitsRef.current.length > 0) {
        const queued = [...pendingEmitsRef.current];
        pendingEmitsRef.current = [];
        queued.forEach(({ eventName, payload }) => {
          socket.emit(eventName, payload);
        });
      }
    });
    socket.on('call:invite', (payload) => inviteRef.current?.(payload));
    socket.on('call:accept', (payload) => acceptRef.current?.(payload));
    socket.on('call:decline', (payload) => declineRef.current?.(payload));
    socket.on('call:missed', (payload) => missedRef.current?.(payload));
    socket.on('call:end', (payload) => endRef.current?.(payload));
    socket.on('call:signal', (payload) => signalRef.current?.(payload));
    socket.on('group:call-invite', (payload) => groupCallInviteRef.current?.(payload));
    socket.on('user:group-call-ended', (payload) => groupCallEndedRef.current?.(payload));

    return () => {
      socket.emit('user:leave', userId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId]);

  const emit = (eventName, payload) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (socket.connected) {
      socket.emit(eventName, payload);
      return;
    }
    // Queue important call events until socket is connected.
    pendingEmitsRef.current.push({ eventName, payload });
  };

  return { emit, socket: socketRef.current };
}

export default useCallSocket;
