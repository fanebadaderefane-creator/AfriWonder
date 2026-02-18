/**
 * Cache abstraction: Redis si REDIS_URL est défini, sinon Map en mémoire.
 * Pour activer Redis: définir REDIS_URL et installer le package "redis".
 */

const CACHE_TTL_SECONDS = 600; // 10 min

const memory = new Map<string, { value: unknown; expiresAt: number }>();

let redisClient: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: { EX?: number }) => Promise<unknown> } | null = null;

const REDIS_CONNECT_TIMEOUT_MS = 5000; // 5 s — évite blocage infini sur Render si REDIS_URL pointe vers une instance injoignable

export async function initRedis(): Promise<typeof redisClient> {
  const url = process.env.REDIS_URL;
  if (!url?.trim()) return null;
  try {
    const { createClient } = await import('redis');
    const client = createClient({
      url,
      socket: { connectTimeout: REDIS_CONNECT_TIMEOUT_MS },
    });
    client.on('error', () => {});
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), REDIS_CONNECT_TIMEOUT_MS)
      ),
    ]);
    redisClient = client as unknown as { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: { EX?: number }) => Promise<unknown> };
    return redisClient;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisClient) redisClient = await initRedis();
  if (redisClient) {
    try {
      const raw = await redisClient.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const hit = memory.get(key);
  if (!hit || Date.now() > hit.expiresAt) return null;
  return hit.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlMs: number = CACHE_TTL_SECONDS * 1000): Promise<void> {
  if (!redisClient) redisClient = await initRedis();
  const ttlSec = Math.ceil(ttlMs / 1000);
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSec });
    } catch {
      memory.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}
