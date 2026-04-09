/**
 * Socket.IO client pour Live Streaming : chat, gifts, tips, viewers, likes en temps réel.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getSocketBaseUrl } from '@/lib/getSocketBaseUrl';
import { createSocket } from '@/lib/socketConfig';

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
    const socket = createSocket(base);
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
