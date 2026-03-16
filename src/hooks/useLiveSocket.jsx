/**
 * Socket.IO client pour Live Streaming : chat, gifts, tips, viewers, likes en temps réel.
 */
import { useEffect, useRef, useCallback } from 'react';
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

/**
 * Hook pour écouter les événements temps réel d'un live (chat,礼物, tips, viewers, like).
 */
export function useLiveSocket(options) {
  const {
    streamId,
    userId,
    onChat,
    onGift,
    onTip,
    onViewers,
    onLike,
    onEnded,
    onChatClear,
    onBanned,
    onPollCreated,
    onPollUpdated,
    onPollEnded,
    onCoHostInvited,
    onCoHostAccepted,
    onCoHostRemoved,
  } = options || {};

  const socketRef = useRef(null);
  const callbacksRef = useRef({ 
    onChat, onGift, onTip, onViewers, onLike, onEnded, onChatClear, onBanned,
    onPollCreated, onPollUpdated, onPollEnded, onCoHostInvited, onCoHostAccepted, onCoHostRemoved
  });
  callbacksRef.current = { 
    onChat, onGift, onTip, onViewers, onLike, onEnded, onChatClear, onBanned,
    onPollCreated, onPollUpdated, onPollEnded, onCoHostInvited, onCoHostAccepted, onCoHostRemoved
  };

  useEffect(() => {
    if (!streamId || !streamId.trim()) return;

    const base = getSocketBaseUrl();
    const socket = io(base, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('live:join-room', streamId);
      if (userId) socket.emit('user:join', userId);
    });

    socket.on('live:chat', (payload) => {
      if (callbacksRef.current.onChat) callbacksRef.current.onChat(payload);
    });

    socket.on('live:gift', (payload) => {
      if (callbacksRef.current.onGift) callbacksRef.current.onGift(payload);
    });

    socket.on('live:tip', (payload) => {
      if (callbacksRef.current.onTip) callbacksRef.current.onTip(payload);
    });

    socket.on('live:viewers', (payload) => {
      if (callbacksRef.current.onViewers) callbacksRef.current.onViewers(payload);
    });

    socket.on('live:like', (payload) => {
      if (callbacksRef.current.onLike) callbacksRef.current.onLike(payload);
    });

    socket.on('live:ended', (payload) => {
      if (callbacksRef.current.onEnded) callbacksRef.current.onEnded(payload);
    });

    socket.on('live:chat:clear', () => {
      if (callbacksRef.current.onChatClear) callbacksRef.current.onChatClear();
    });

    socket.on('live:banned', (payload) => {
      if (callbacksRef.current.onBanned) callbacksRef.current.onBanned(payload);
    });

    socket.on('live:poll:created', (payload) => {
      if (callbacksRef.current.onPollCreated) callbacksRef.current.onPollCreated(payload);
    });

    socket.on('live:poll:updated', (payload) => {
      if (callbacksRef.current.onPollUpdated) callbacksRef.current.onPollUpdated(payload);
    });

    socket.on('live:poll:ended', (payload) => {
      if (callbacksRef.current.onPollEnded) callbacksRef.current.onPollEnded(payload);
    });

    socket.on('live:cohost:invited', (payload) => {
      if (callbacksRef.current.onCoHostInvited) callbacksRef.current.onCoHostInvited(payload);
    });

    socket.on('live:cohost:accepted', (payload) => {
      if (callbacksRef.current.onCoHostAccepted) callbacksRef.current.onCoHostAccepted(payload);
    });

    socket.on('live:cohost:removed', (payload) => {
      if (callbacksRef.current.onCoHostRemoved) callbacksRef.current.onCoHostRemoved(payload);
    });

    return () => {
      socket.emit('live:leave-room', streamId);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, userId]);

  return { socket: socketRef.current };
}
