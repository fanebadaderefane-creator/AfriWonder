import { createClient } from 'redis';

// Shared Redis client — used by rate limiting, auth cache, and other services.
// Falls back gracefully to null when REDIS_URL is not configured.
const redisClient = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;

if (redisClient) {
  redisClient.connect().catch((err) => {
    // Non-fatal: the app works without Redis (in-memory fallback for rate limiting,
    // no caching for auth). Log the error but do not crash the process.
    console.error('[Redis] Connection failed — running without Redis cache:', err.message);
  });
}

export default redisClient;
