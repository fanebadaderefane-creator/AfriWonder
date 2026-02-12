/**
 * Socket.IO client pour Live Streaming : chat, gifts, tips, viewers, likes en temps réel.
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketBaseUrl = () => {
  const api = import.meta.env.VITE_API_URL || '';
  if (api) return api.replace(/\/api\/?$/, '') || window.location.origin;
  return window.location.origin;
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
  } = options || {};

  const socketRef = useRef(null);
  const callbacksRef = useRef({ onChat, onGift, onTip, onViewers, onLike, onEnded, onChatClear, onBanned });
  callbacksRef.current = { onChat, onGift, onTip, onViewers, onLike, onEnded, onChatClear, onBanned };

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

    return () => {
      socket.emit('live:leave-room', streamId);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, userId]);

  return { socket: socketRef.current };
}
