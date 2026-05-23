/**
 * Révocation des JWT d’accès au logout (clé jti + TTL = durée de vie restante du token).
 * Redis si REDIS_URL ; sinon Map mémoire (OK pour tests / single dev node, insuffisant en prod multi-instance).
 */

type Entry = { expiresAt: number };

const memoryStore = new Map<string, Entry>();
let redisClientPromise: Promise<any> | null = null;

function accessKey(jti: string) {
  return `afw:revoked_access:${jti}`;
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

export async function revokeAccessToken(jti: string, expUnixSeconds: number) {
  if (!jti) return;
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(1, expUnixSeconds - now);
  const key = accessKey(jti);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, '1', { EX: ttl });
    return;
  }
  cleanupMemory();
  memoryStore.set(key, { expiresAt: Date.now() + ttl * 1000 });
}

export async function isAccessTokenRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const key = accessKey(jti);
  const redis = await getRedisClient();
  if (redis) {
    const v = await redis.get(key);
    return v === '1';
  }
  cleanupMemory();
  return memoryStore.has(key);
}
