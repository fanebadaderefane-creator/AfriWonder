import { useEffect, useRef, useCallback, useState } from "react";
import { logger } from '@/lib/logger';

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.REACT_APP_WS_URL || "wss://api.afriwonder.app/ws";

export function useWebSocket(userId) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(`${WS_URL}?userId=${userId}`);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages(prev => [...prev, message]);
      } catch (_error) {
        logger.error("WebSocket parse error", _error, { context: 'useWebSocket' });
      }
    };

    ws.onerror = (_error) => {
      logger.error("WebSocket error", _error, { context: 'useWebSocket' });
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId]);

  const send = useCallback((type, data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  return { isConnected, messages, send };
}

// Live chat hook
export function useLiveChat(liveStreamId, userId, userName, userAvatar) {
  const { isConnected, messages, send } = useWebSocket(userId);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const liveChatMessages = messages.filter(msg => msg.type === "live_chat");
    setChatMessages(prev => [...prev, ...liveChatMessages]);
  }, [messages]);

  const sendChatMessage = useCallback((message) => {
    send("live_chat", {
      roomId: liveStreamId,
      data: { message, senderName: userName, senderAvatar: userAvatar }
    });
  }, [send, liveStreamId, userName, userAvatar]);

  useEffect(() => {
    if (isConnected) {
      send("join_live", { roomId: liveStreamId });
    }
    return () => {
      if (isConnected) {
        send("leave_live", { roomId: liveStreamId });
      }
    };
  }, [isConnected, liveStreamId, send]);

  return { chatMessages, sendChatMessage, isConnected };
}

// Viewers count hook
export function useViewersCount(liveStreamId) {
  const { isConnected, messages, send } = useWebSocket(null);
  const [viewersCount, setViewersCount] = useState(0);

  useEffect(() => {
    const viewerUpdates = messages.filter(msg => msg.type === "viewers_count");
    if (viewerUpdates.length > 0) {
      const latest = viewerUpdates[viewerUpdates.length - 1];
      setViewersCount(latest.count);
    }
  }, [messages]);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        send("viewers_update", { roomId: liveStreamId });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, liveStreamId, send]);

  return viewersCount;
}

// Notifications hook
export function useNotifications(userId) {
  const { isConnected, messages } = useWebSocket(userId);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const notifs = messages.filter(msg => msg.type === "notification");
    setNotifications(prev => [...prev, ...notifs]);
  }, [messages]);

  return { notifications, isConnected };
}

// Direct messages hook
export function useDirectMessages(userId) {
  const { isConnected, messages, send } = useWebSocket(userId);
  const [directMessages, setDirectMessages] = useState([]);

  useEffect(() => {
    const dms = messages.filter(msg => msg.type === "direct_message");
    setDirectMessages(prev => [...prev, ...dms]);
  }, [messages]);

  const sendDirectMessage = useCallback((recipientId, message, senderName, senderAvatar) => {
    send("direct_message", {
      recipientId,
      data: { message, senderName, senderAvatar }
    });
  }, [send]);

  return { directMessages, sendDirectMessage, isConnected };
}

// Live gifts hook
export function useLiveGifts(liveStreamId) {
  const { isConnected, messages, send } = useWebSocket(null);
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    const giftMessages = messages.filter(msg => msg.type === "live_gift");
    setGifts(prev => [...prev, ...giftMessages]);
  }, [messages]);

  const sendGift = useCallback((giftData) => {
    send("live_gift", { roomId: liveStreamId, data: giftData });
  }, [send, liveStreamId]);

  return { gifts, sendGift, isConnected };
}