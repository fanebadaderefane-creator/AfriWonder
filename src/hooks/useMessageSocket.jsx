/**
 * Socket.io client pour Messages : user:join, conversation room, typing, new message, read.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
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
 * Hook pour une conversation : join/leave room, typing, écoute new_message / message:read.
 * Expose isConnected pour afficher un indicateur de reconnexion (socket.io gère la reconnexion automatique).
 */
export function useConversationSocket(options) {
  const {
    userId,
    conversationId,
    userName,
    onNewMessage,
    onMessageRead,
  } = options || {};
  const socketRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const typingTimeoutRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  onNewMessageRef.current = onNewMessage;
  onMessageReadRef.current = onMessageRead;

  useEffect(() => {
    if (!userId || !conversationId) return;
    const base = getSocketBaseUrl();
    const socket = io(base, { path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:join', userId);
      socket.emit('message:join-conversation', conversationId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('message:new', (payload) => {
      if (onNewMessageRef.current) onNewMessageRef.current(payload);
    });
    socket.on('message:updated', (payload) => {
      if (onNewMessageRef.current) onNewMessageRef.current(payload);
    });
    socket.on('message:read', (payload) => {
      if (onMessageReadRef.current) onMessageReadRef.current(payload);
    });
    socket.on('message:typing', (payload) => {
      if (payload.userId === userId) return;
      setTypingUser(payload.typing ? { userId: payload.userId, name: payload.name || 'Quelqu\'un' } : null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (payload.typing) {
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 4000);
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('message:leave-conversation', conversationId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, conversationId]);

  const emitTypingStart = useCallback(() => {
    if (socketRef.current?.connected && conversationId && userId && userName) {
      socketRef.current.emit('message:typing-start', { conversationId, userId, name: userName });
    }
  }, [conversationId, userId, userName]);

  const emitTypingStop = useCallback(() => {
    if (socketRef.current?.connected && conversationId && userId) {
      socketRef.current.emit('message:typing-stop', { conversationId, userId });
    }
  }, [conversationId, userId]);

  return { typingUser, emitTypingStart, emitTypingStop, isConnected };
}
