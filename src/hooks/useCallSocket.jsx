import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// URL de base pour Socket.IO (prend en compte VITE_WS_URL, VITE_API_URL, puis fallback local dev)
const getSocketBaseUrl = () => {
  const ws = import.meta.env.VITE_WS_URL || '';
  if (ws) {
    try {
      const url = new URL(ws);
      if (url.protocol === 'ws:') url.protocol = 'http:';
      if (url.protocol === 'wss:') url.protocol = 'https:';
      return url.origin;
    } catch {
      // ignore et continuer sur VITE_API_URL
    }
  }

  const api = import.meta.env.VITE_API_URL || '';
  if (api) {
    return api.replace(/\/api\/?$/, '') || window.location.origin;
  }

  // Fallback dev: si on est sur localhost:5173, on bascule vers 3000 (backend par défaut)
  try {
    const current = new URL(window.location.origin);
    if ((current.hostname === 'localhost' || current.hostname === '127.0.0.1') && current.port === '5173') {
      current.port = '3000';
      return current.origin;
    }
    return current.origin;
  } catch {
    return window.location.origin;
  }
};

export function useCallSocket({ userId, onInvite, onAccept, onDecline, onEnd, onSignal } = {}) {
  const socketRef = useRef(null);
  const inviteRef = useRef(onInvite);
  const acceptRef = useRef(onAccept);
  const declineRef = useRef(onDecline);
  const endRef = useRef(onEnd);
  const signalRef = useRef(onSignal);

  inviteRef.current = onInvite;
  acceptRef.current = onAccept;
  declineRef.current = onDecline;
  endRef.current = onEnd;
  signalRef.current = onSignal;

  useEffect(() => {
    if (!userId) return;
    const base = getSocketBaseUrl();
    const socket = io(base, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:join', userId);
    });
    socket.on('call:invite', (payload) => inviteRef.current?.(payload));
    socket.on('call:accept', (payload) => acceptRef.current?.(payload));
    socket.on('call:decline', (payload) => declineRef.current?.(payload));
    socket.on('call:end', (payload) => endRef.current?.(payload));
    socket.on('call:signal', (payload) => signalRef.current?.(payload));

    return () => {
      socket.emit('user:leave', userId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId]);

  const emit = (eventName, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, payload);
    }
  };

  return { emit, socket: socketRef.current };
}

export default useCallSocket;
