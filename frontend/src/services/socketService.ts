import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getBackendOrigin, DEFAULT_BACKEND_ORIGIN } from '../config/backendBase';

/**
 * Même hôte que l’API (en dev web : localhost:3000, pas le port Metro).
 * Recalculé à chaque connexion pour prendre en compte les changements d'origine
 * (probing Android dev, mise à jour de l'env runtime).
 */
let socketConfigWarningShown = false;

function readConfiguredSocketUrl(): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    extra?.EXPO_PUBLIC_SOCKET_URL
    || process.env.EXPO_PUBLIC_SOCKET_URL
    || ''
  ).trim();
  return raw.replace(/\/+$/, '');
}

function maybeWarnAboutSocketConfig(url: string): void {
  if (socketConfigWarningShown) return;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  if (Platform.OS === 'web') return;

  if (url.startsWith('http://')) {
    socketConfigWarningShown = true;
    console.warn(
      '[AfriWonder] Native release should use secure socket URL (wss/https). '
      + 'Set EXPO_PUBLIC_SOCKET_URL=wss://api.afriwonder.com or EXPO_PUBLIC_BACKEND_URL=https://api.afriwonder.com.'
    );
    return;
  }

  if (url.includes('.invalid')) {
    socketConfigWarningShown = true;
    console.error(
      '[AfriWonder] Critical socket configuration: backend/socket URL is not configured for native release.'
    );
  }
}

function resolveSocketUrl(): string {
  const configuredSocketUrl = readConfiguredSocketUrl();
  if (configuredSocketUrl) {
    maybeWarnAboutSocketConfig(configuredSocketUrl);
    return configuredSocketUrl;
  }

  const o = getBackendOrigin();
  if (o) {
    maybeWarnAboutSocketConfig(o);
    return o;
  }
  const fallback =
    typeof window !== 'undefined' ? window.location.origin : DEFAULT_BACKEND_ORIGIN;
  maybeWarnAboutSocketConfig(fallback);
  return fallback;
}

/**
 * Contrat côté backend (`backend/src/index.ts` + `message.service.ts`) :
 *   - Écoute : `message:join-conversation`, `message:leave-conversation`,
 *              `message:typing-start`, `message:typing-stop`, `user:join`, `user:leave`,
 *              `call:*`, `live:join-room`, `live:leave-room`.
 *   - Émet   : `message:new`, `message:read`, `message:delivered`, `message:typing`,
 *              `message:unread`, `message:deleted`, `message:updated`, `message:pinned`,
 *              `call:*`, `live:*`.
 *
 * On conserve l'API publique historique (`sendMessage`, `joinConversation`,
 * `startTyping`, `stopTyping`, `markRead`, listeners `new_message` / `user_typing` /
 * `messages_read` / `authenticated`) pour ne pas casser les écrans consommateurs,
 * et on alias les noms d'events en interne :
 *   `message:new`     → expose aussi `new_message`
 *   `message:typing`  → expose `user_typing` / `user_stop_typing`
 *   `message:read`    → expose `messages_read`
 *   `connect` (OK)    → expose aussi `authenticated` (le backend n'utilise pas de
 *                       handshake applicatif, la connexion seule vaut auth).
 * Le `sendMessage` socket est une **no-op** : l'envoi réel passe par REST
 * `POST /messages/send`, et le backend rebroadcast `message:new` depuis le service REST.
 */
class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private userContext: { id: string; name?: string } | null = null;

  /**
   * Définir l'identité du user pour les événements qui nécessitent `userId` / `name`
   * dans le payload (typing, recording). Appelé depuis `_layout.tsx` au login.
   */
  setUserContext(userId: string, name?: string) {
    if (!userId) return;
    this.userContext = { id: userId, name };
  }

  connect(_token: string) {
    if (this.socket?.connected) return;

    const url = resolveSocketUrl();
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    /** Relais live:* / call:* / presence:* / message:* aux abonnés applicatifs. */
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
      // Pas de handshake applicatif côté backend — la connexion vaut auth.
      // On synthétise `authenticated` pour préserver le contrat avec `_layout.tsx`.
      this.notifyListeners('authenticated', { id: this.socket?.id });
    });

    // Alias des events backend vers les noms attendus par les écrans.
    this.socket.on('message:new', (msg: unknown) => {
      this.notifyListeners('new_message', msg);
    });

    this.socket.on('message:typing', (data: { userId?: string; typing?: boolean; name?: string }) => {
      if (data?.typing === false) {
        this.notifyListeners('user_stop_typing', data);
      } else {
        this.notifyListeners('user_typing', data);
      }
    });

    this.socket.on('message:read', (data: unknown) => {
      this.notifyListeners('messages_read', data);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      this.notifyListeners('disconnected', { reason });
    });

    this.socket.on('connect_error', (err: { message?: string }) => {
      console.warn('[Socket] Connection error:', err?.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * @deprecated Le backend n'écoute pas `send_message` sur la socket.
   * L'envoi réel est un `POST /api/messages/send` (voir `messages/[id].tsx`).
   * Conservé pour compatibilité — no-op côté réseau.
   */
  sendMessage(_conversationId: string, _content: string, _type: string = 'text', _replyTo?: unknown) {
    /* no-op : routé via REST ; le backend rebroadcast `message:new` depuis le service. */
  }

  joinConversation(conversationId: string) {
    if (!conversationId) return;
    this.socket?.emit('message:join-conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    if (!conversationId) return;
    this.socket?.emit('message:leave-conversation', conversationId);
  }

  joinUserRoom(userId: string, name?: string) {
    if (!userId) return;
    this.setUserContext(userId, name);
    this.socket?.emit('user:join', userId);
  }

  leaveUserRoom(userId: string) {
    if (userId) this.socket?.emit('user:leave', userId);
  }

  startTyping(conversationId: string) {
    if (!conversationId || !this.userContext?.id) return;
    this.socket?.emit('message:typing-start', {
      conversationId,
      userId: this.userContext.id,
      name: this.userContext.name,
    });
  }

  stopTyping(conversationId: string) {
    if (!conversationId || !this.userContext?.id) return;
    this.socket?.emit('message:typing-stop', {
      conversationId,
      userId: this.userContext.id,
    });
  }

  /**
   * Le backend n'a pas de handler socket pour le "mark as read".
   * On appelle l'endpoint REST `PUT /api/messages/:conversationId/read`,
   * qui émet ensuite `message:read` aux autres participants.
   * Import dynamique pour éviter toute dépendance circulaire avec `api/client`.
   */
  markRead(conversationId: string) {
    if (!conversationId) return;
    void import('../api/client').then((mod) => {
      mod.default
        .put(`/messages/${encodeURIComponent(conversationId)}/read`, {})
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[socket] markRead REST failed', msg);
        });
    });
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  joinLiveStream(streamId: string) {
    if (streamId) this.socket?.emit('live:join-room', streamId);
  }

  leaveLiveStream(streamId: string) {
    if (streamId) this.socket?.emit('live:leave-room', streamId);
  }

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

  private notifyListeners(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('[Socket] listener threw for', event, err);
      }
    });
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
