/**
 * Socket.io partagé (MessageSocketProvider) : room conversation + typing / lecture.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useMessageSocketContext } from '@/contexts/MessageSocketContext';

export function useConversationSocket(options) {
  const {
    userId,
    conversationId,
    peerId,
    userName,
    onNewMessage,
    onMessageRead,
    onMessageDelivered,
  } = options || {};

  const { socket } = useMessageSocketContext() || {};
  const socketEverConnectedRef = useRef(false);
  const [typingUser, setTypingUser] = useState(null);
  const [recordingUser, setRecordingUser] = useState(null);
  const [presence, setPresence] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  const typingTimeoutRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const onMessageDeliveredRef = useRef(onMessageDelivered);
  onNewMessageRef.current = onNewMessage;
  onMessageReadRef.current = onMessageRead;
  onMessageDeliveredRef.current = onMessageDelivered;

  useEffect(() => {
    if (!socket || !userId || !conversationId) {
      setIsConnected(false);
      return undefined;
    }

    const joinConversation = () => {
      socket.emit('message:join-conversation', conversationId);
    };

    const onConnect = () => {
      socketEverConnectedRef.current = true;
      setIsConnected(true);
      joinConversation();
    };

    const onDisconnect = () => setIsConnected(false);

    const onNew = (payload) => onNewMessageRef.current?.(payload);
    const onUpdated = (payload) => onNewMessageRef.current?.(payload);
    const onRead = (payload) => onMessageReadRef.current?.(payload);
    const onDelivered = (payload) => onMessageDeliveredRef.current?.(payload);
    const onTyping = (payload) => {
      if (payload.userId === userId) return;
      setTypingUser(payload.typing ? { userId: payload.userId, name: payload.name || "Quelqu'un" } : null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (payload.typing) {
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    };
    const onRecording = (payload) => {
      if (payload.userId === userId) return;
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (payload.recording) {
        setRecordingUser({ userId: payload.userId, name: payload.name || "Quelqu'un" });
        recordingTimeoutRef.current = setTimeout(() => setRecordingUser(null), 120_000);
      } else {
        setRecordingUser(null);
      }
    };

    const onPresenceUpdate = (payload) => {
      if (!peerId || payload?.userId !== peerId) return;
      setPresence({
        is_online: !!payload.isOnline,
        last_seen: payload.lastSeen || null,
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('message:read', onRead);
    socket.on('message:delivered', onDelivered);
    socket.on('message:typing', onTyping);
    socket.on('message:recording', onRecording);
    socket.on('presence:update', onPresenceUpdate);

    if (socket.connected) {
      socketEverConnectedRef.current = true;
      setIsConnected(true);
      joinConversation();
    } else {
      setIsConnected(false);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      socket.emit('message:leave-conversation', conversationId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('message:read', onRead);
      socket.off('message:delivered', onDelivered);
      socket.off('message:typing', onTyping);
      socket.off('message:recording', onRecording);
      socket.off('presence:update', onPresenceUpdate);
    };
  }, [socket, userId, conversationId, peerId]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      setShowReconnectBanner(false);
      return undefined;
    }
    if (!isOnline) {
      // Hors ligne : éviter le faux message "reconnexion..." du socket.
      setShowReconnectBanner(false);
      return undefined;
    }
    const delayMs = socketEverConnectedRef.current ? 2800 : 12_000;
    const id = window.setTimeout(() => setShowReconnectBanner(true), delayMs);
    return () => window.clearTimeout(id);
  }, [isConnected, isOnline]);

  const emitTypingStart = useCallback(() => {
    if (socket?.connected && conversationId && userId && userName) {
      socket.emit('message:typing-start', { conversationId, userId, name: userName });
    }
  }, [socket, conversationId, userId, userName]);

  const emitTypingStop = useCallback(() => {
    if (socket?.connected && conversationId && userId) {
      socket.emit('message:typing-stop', { conversationId, userId });
    }
  }, [socket, conversationId, userId]);

  const emitRecordingStart = useCallback(() => {
    if (socket?.connected && conversationId && userId && userName) {
      socket.emit('message:recording-start', { conversationId, userId, name: userName });
    }
  }, [socket, conversationId, userId, userName]);

  const emitRecordingStop = useCallback(() => {
    if (socket?.connected && conversationId && userId) {
      socket.emit('message:recording-stop', { conversationId, userId });
    }
  }, [socket, conversationId, userId]);

  return {
    typingUser,
    recordingUser,
    presence,
    emitTypingStart,
    emitTypingStop,
    emitRecordingStart,
    emitRecordingStop,
    isConnected,
    isOnline,
    showReconnectBanner,
  };
}
