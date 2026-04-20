import { io, Socket } from 'socket.io-client';
import { getBackendOrigin, DEFAULT_BACKEND_ORIGIN } from '../config/backendBase';

// Même hôte que l’API (en dev web : localhost:3000, pas le port Metro).
const SOCKET_URL = (() => {
  const o = getBackendOrigin();
  if (o) return o;
  if (typeof window !== 'undefined') return window.location.origin;
  return DEFAULT_BACKEND_ORIGIN;
})();

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    /** Relais événements live, signalisation appels (`call:*`) et présence vers les abonnés. */
    this.socket.onAny((event: string, ...args: unknown[]) => {
      if (typeof event !== 'string') return;
      if (
        event.startsWith('live:') ||
        event.startsWith('call:') ||
        event.startsWith('presence:') ||
        event.startsWith('message:')
      ) {
        this.notifyListeners(event, args[0]);
      }
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Authenticate after connecting
      this.socket?.emit('authenticate', { token });
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('[Socket] Authenticated:', data);
      this.notifyListeners('authenticated', data);
    });

    this.socket.on('auth_error', (data: any) => {
      console.log('[Socket] Auth error:', data);
    });

    this.socket.on('new_message', (msg: any) => {
      this.notifyListeners('new_message', msg);
    });

    this.socket.on('user_typing', (data: any) => {
      this.notifyListeners('user_typing', data);
    });

    this.socket.on('user_stop_typing', (data: any) => {
      this.notifyListeners('user_stop_typing', data);
    });

    this.socket.on('messages_read', (data: any) => {
      this.notifyListeners('messages_read', data);
    });

    this.socket.on('notification', (data: any) => {
      this.notifyListeners('notification', data);
    });

    this.socket.on('new_notification', (data: any) => {
      this.notifyListeners('new_notification', data);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      this.notifyListeners('disconnected', { reason });
    });

    this.socket.on('connect_error', (err: any) => {
      console.log('[Socket] Connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Send a message via Socket.IO
  sendMessage(conversationId: string, content: string, type: string = 'text', replyTo?: any) {
    this.socket?.emit('send_message', {
      conversation_id: conversationId,
      content,
      type,
      reply_to: replyTo,
    });
  }

  // Join a conversation room
  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', { conversation_id: conversationId });
  }

  /** Annonce l'arrivée du user sur la plateforme — déclenche `broadcastPresence(true)` côté backend. */
  joinUserRoom(userId: string) {
    if (userId) this.socket?.emit('user:join', userId);
  }

  /** Annonce la sortie du user (logout / app fermée explicitement). */
  leaveUserRoom(userId: string) {
    if (userId) this.socket?.emit('user:leave', userId);
  }

  // Typing indicators
  startTyping(conversationId: string) {
    this.socket?.emit('typing', { conversation_id: conversationId });
  }

  stopTyping(conversationId: string) {
    this.socket?.emit('stop_typing', { conversation_id: conversationId });
  }

  // Mark messages as read
  markRead(conversationId: string) {
    this.socket?.emit('mark_read', { conversation_id: conversationId });
  }

  /** Émission générique (ex. événements custom côté serveur). */
  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  /** Rejoindre la room Socket `stream:{streamId}` (requis pour recevoir `live:gift`, chat, etc.). */
  joinLiveStream(streamId: string) {
    if (streamId) this.socket?.emit('live:join-room', streamId);
  }

  leaveLiveStream(streamId: string) {
    if (streamId) this.socket?.emit('live:leave-room', streamId);
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
