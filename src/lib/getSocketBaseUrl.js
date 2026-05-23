import { API_URL } from '@/lib/apiBaseUrl.js';

/**
 * Origin HTTP(S) pour socket.io-client (path `/socket.io`).
 * En dev sous Vite (5173), on utilise l’origine du front pour que Socket.IO passe par le proxy Vite
 * (`/socket.io` → backend), comme `/api` — évite les erreurs ws://localhost:3000 quand le navigateur
 * ou le pare-feu bloque le port 3000 en direct.
 */
export function getSocketBaseUrl() {
  // Toujours en premier : sinon VITE_WS_URL=ws://localhost:3000 ou VITE_API_URL forcent le port 3000
  // et le navigateur n’utilise pas le proxy Vite pour /socket.io.
  if (import.meta.env.DEV) {
    try {
      const current = new URL(window.location.origin);
      if (
        (current.hostname === 'localhost' || current.hostname === '127.0.0.1') &&
        current.port === '5173'
      ) {
        return current.origin;
      }
    } catch {
      /* ignore */
    }
  }

  const ws = import.meta.env.VITE_WS_URL || '';
  if (ws) {
    try {
      const url = new URL(ws);
      if (url.protocol === 'ws:') url.protocol = 'http:';
      if (url.protocol === 'wss:') url.protocol = 'https:';
      return url.origin;
    } catch {
      // continuer
    }
  }

  let api = import.meta.env.VITE_API_URL || '';
  if (!api && API_URL && /^https?:\/\//i.test(API_URL)) {
    api = API_URL;
  }
  if (api) {
    const stripped = api.replace(/\/api\/?$/, '');
    if (stripped) return stripped;
  }

  try {
    return new URL(window.location.origin).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}

/**
 * Ordre des transports Socket.IO.
 * En dev sur Vite (5173), le WebSocket via proxy échoue souvent sous Firefox avant le fallback,
 * ce qui remplit la console d’erreurs rouges ; le polling HTTP passe par le même proxy que `/api` et fonctionne.
 */
export function getSocketIoTransports() {
  if (!import.meta.env.DEV) return ['websocket', 'polling'];
  if (typeof window === 'undefined') return ['websocket', 'polling'];
  try {
    const { hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
      return ['polling', 'websocket'];
    }
  } catch {
    /* ignore */
  }
  return ['websocket', 'polling'];
}
