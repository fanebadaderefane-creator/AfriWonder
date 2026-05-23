import { io } from 'socket.io-client';
import { getSocketIoTransports } from '@/lib/getSocketBaseUrl';
import { isEffectiveConnectionSlow } from '@/lib/networkHints.js';

function pickSocketTransports() {
  const base = getSocketIoTransports();
  if (!Array.isArray(base) || base.length === 0) return ['polling', 'websocket'];
  const slow = typeof navigator !== 'undefined' && isEffectiveConnectionSlow();
  if (!slow) return base;
  // Réseau lent/instable : tenter d'abord polling (souvent plus tolérant sur 2G/3G).
  const unique = Array.from(new Set(base));
  const hasPolling = unique.includes('polling');
  const hasWebsocket = unique.includes('websocket');
  if (hasPolling && hasWebsocket) return ['polling', 'websocket'];
  return unique;
}

export function createSocket(url, extra = {}) {
  return io(url, {
    path: '/socket.io',
    transports: pickSocketTransports(),
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
    reconnectionAttempts: Infinity,
    timeout: 15_000,
    upgrade: true,
    compress: true,
    pingInterval: 25_000,
    pingTimeout: 10_000,
    ...extra,
  });
}

