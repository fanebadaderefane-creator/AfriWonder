import { createHash } from 'node:crypto';

type Entry = { expiresAt: number };

const memoryStore = new Map<string, Entry>();
let redisClientPromise: Promise<any> | null = null;

function tokenKey(refreshToken: string) {
  const digest = createHash('sha256').update(refreshToken).digest('hex');
  return `afw:revoked_refresh:${digest}`;
}

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!redisClientPromise) {
    redisClientPromise = import('redis')
      .then(async ({ createClient }) => {
        const client = createClient({ url: process.env.REDIS_URL });
        await client.connect();
        return client;
      })
      .catch(() => null);
  }
  return redisClientPromise;
}

function cleanupMemory() {
  const now = Date.now();
  for (const [k, v] of memoryStore.entries()) {
    if (v.expiresAt <= now) memoryStore.delete(k);
  }
}

export async function revokeRefreshToken(refreshToken: string, expUnixSeconds: number) {
  if (!refreshToken) return;
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(1, expUnixSeconds - now);
  const key = tokenKey(refreshToken);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, '1', { EX: ttl });
    return;
  }
  cleanupMemory();
  memoryStore.set(key, { expiresAt: Date.now() + ttl * 1000 });
}

export async function isRefreshTokenRevoked(refreshToken: string) {
  if (!refreshToken) return true;
  const key = tokenKey(refreshToken);
  const redis = await getRedisClient();
  if (redis) {
    const v = await redis.get(key);
    return v === '1';
  }
  cleanupMemory();
  return memoryStore.has(key);
}
