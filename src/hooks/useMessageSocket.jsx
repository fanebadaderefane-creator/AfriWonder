/**
 * Socket.io client pour Messages : user:join, conversation room, typing, new message, read.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl, getSocketIoTransports } from '@/lib/getSocketBaseUrl';

/**
 * Hook pour une conversation : join/leave room, typing, écoute new_message / message:read / message:delivered.
 * Expose isConnected pour afficher un indicateur de reconnexion (socket.io gère la reconnexion automatique).
 */
export function useConversationSocket(options) {
  const {
    userId,
    conversationId,
    userName,
    onNewMessage,
    onMessageRead,
    onMessageDelivered,
  } = options || {};
  const socketRef = useRef(null);
  const socketEverConnectedRef = useRef(false);
  const [typingUser, setTypingUser] = useState(null);
  const [recordingUser, setRecordingUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  /** Évite le bandeau « Reconnexion » sur les micro-coupures Socket.io (reconnexion auto). */
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const typingTimeoutRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const onMessageDeliveredRef = useRef(onMessageDelivered);
  onNewMessageRef.current = onNewMessage;
  onMessageReadRef.current = onMessageRead;
  onMessageDeliveredRef.current = onMessageDelivered;

  useEffect(() => {
    if (!userId || !conversationId) return;
    const base = getSocketBaseUrl();
    const socket = io(base, {
      path: '/socket.io',
      transports: getSocketIoTransports(),
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socketEverConnectedRef.current = true;
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
    socket.on('message:delivered', (payload) => {
      if (onMessageDeliveredRef.current) onMessageDeliveredRef.current(payload);
    });
    socket.on('message:typing', (payload) => {
      if (payload.userId === userId) return;
      setTypingUser(payload.typing ? { userId: payload.userId, name: payload.name || 'Quelqu\'un' } : null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (payload.typing) {
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 4000);
      }
    });

    socket.on('message:recording', (payload) => {
      if (payload.userId === userId) return;
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (payload.recording) {
        setRecordingUser({ userId: payload.userId, name: payload.name || 'Quelqu\'un' });
        // Sécurité : si le pair ferme l’onglet sans envoyer recording-stop
        recordingTimeoutRef.current = setTimeout(() => setRecordingUser(null), 120_000);
      } else {
        setRecordingUser(null);
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      socket.emit('message:leave-conversation', conversationId);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, conversationId]);

  useEffect(() => {
    if (isConnected) {
      setShowReconnectBanner(false);
      return undefined;
    }
    /** Délai plus long au 1er jet (backend / proxy Vite parfois lent en dev). */
    const delayMs = socketEverConnectedRef.current ? 2800 : 12_000;
    const id = window.setTimeout(() => setShowReconnectBanner(true), delayMs);
    return () => window.clearTimeout(id);
  }, [isConnected]);

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

  const emitRecordingStart = useCallback(() => {
    if (socketRef.current?.connected && conversationId && userId && userName) {
      socketRef.current.emit('message:recording-start', { conversationId, userId, name: userName });
    }
  }, [conversationId, userId, userName]);

  const emitRecordingStop = useCallback(() => {
    if (socketRef.current?.connected && conversationId && userId) {
      socketRef.current.emit('message:recording-stop', { conversationId, userId });
    }
  }, [conversationId, userId]);

  return {
    typingUser,
    recordingUser,
    emitTypingStart,
    emitTypingStop,
    emitRecordingStart,
    emitRecordingStop,
    isConnected,
    showReconnectBanner,
  };
}
