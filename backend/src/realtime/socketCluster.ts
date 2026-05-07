/**
 * Socket.io + Redis adapter avec retries — si Redis est down, l’API reste en single-node
 * (pas de crash). Les logs permettent de diagnostiquer l’infra.
 */
import type { Server } from 'socket.io';
import { logger } from '../utils/logger.js';

const REDIS_ADAPTER_RETRIES = 3;
const REDIS_ADAPTER_BACKOFF_MS = 1500;

export type SocketClusterAttachResult = {
  mode: 'redis' | 'none';
  attempts: number;
  lastError?: string;
};

export async function attachSocketIoRedisAdapterWithRetry(io: Server): Promise<SocketClusterAttachResult> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    logger.info('socketCluster: REDIS_URL absent — WebSocket single-node');
    return { mode: 'none', attempts: 0 };
  }

  let lastErr: string | undefined;
  for (let attempt = 1; attempt <= REDIS_ADAPTER_RETRIES; attempt += 1) {
    try {
      const { createClient } = await import('redis');
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('socketCluster: adapter Redis actif (scale horizontal)', { attempt });
      return { mode: 'redis', attempts: attempt };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      logger.warn('socketCluster: échec tentative adapter Redis', { attempt, error: lastErr });
      if (attempt < REDIS_ADAPTER_RETRIES) {
        await new Promise((r) => setTimeout(r, REDIS_ADAPTER_BACKOFF_MS * attempt));
      }
    }
  }

  logger.error('socketCluster: Redis indisponible après retries — poursuite single-node', {
    lastError: lastErr,
  });
  return { mode: 'none', attempts: REDIS_ADAPTER_RETRIES, lastError: lastErr };
}
