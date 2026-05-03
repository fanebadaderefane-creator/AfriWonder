import type { Request, Response } from 'express';

/**
 * Santé API étendue (DB + Redis) — partagée entre `/api/health` et `/api/v1/health`
 * pour respecter le versionnement sans dupliquer la logique (manuel durabilité ch.1).
 */
export async function sendExtendedApiHealth(_req: Request, res: Response): Promise<void> {
  const uptimeSeconds = Math.floor(process.uptime());
  let db: 'ok' | 'error' = 'ok';
  let redis: 'ok' | 'skipped' | 'error' = 'skipped';

  try {
    const prisma = (await import('../config/database.js')).default;
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  try {
    const redisClient = (await import('../config/redis.js')).default;
    if (redisClient) {
      if (!redisClient.isOpen) {
        await redisClient.connect().catch(() => {});
      }
      if (redisClient.isOpen) {
        await redisClient.ping();
        redis = 'ok';
      } else {
        redis = 'error';
      }
    }
  } catch {
    redis = process.env.REDIS_URL?.trim() ? 'error' : 'skipped';
  }

  const degraded = db !== 'ok' || redis === 'error';
  res.status(degraded ? 503 : 200).json({
    status: degraded ? 'degraded' : 'ok',
    db,
    redis,
    uptime_seconds: uptimeSeconds,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
