import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

type PublicApiContext = {
  keyHash: string;
  keyAlias: string;
};

type PublicApiUsageSnapshot = {
  minute: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: number;
  };
  day: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: number;
  };
};

const minuteBuckets = new Map<string, { count: number; resetAt: number }>();
const dayBuckets = new Map<string, { count: number; resetAt: number }>();

function getAllowedKeys(): string[] {
  const envKeys = String(process.env.PUBLIC_API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    envKeys.push(process.env.PUBLIC_API_DEV_KEY || 'afw_public_dev_key');
  }

  return [...new Set(envKeys)];
}

function hashKey(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function getRateLimitPerMinute() {
  const parsed = parseInt(String(process.env.PUBLIC_API_RATE_LIMIT_PER_MIN || '60'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

function getDailyQuota() {
  const parsed = parseInt(String(process.env.PUBLIC_API_DAILY_QUOTA || '2000'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}

function getMinuteKey(keyHash: string) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  return `${keyHash}:${minute}`;
}

function getDayKey(keyHash: string) {
  const now = new Date();
  return `${keyHash}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

function touchCounter(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  resetAt: number
) {
  const existing = store.get(key);
  if (!existing || existing.resetAt <= Date.now()) {
    const created = { count: 1, resetAt };
    store.set(key, created);
    return created;
  }
  existing.count += 1;
  return existing;
}

export function getPublicApiContext(req: Request): PublicApiContext | null {
  return ((req as any).publicApi as PublicApiContext) || null;
}

export function getPublicApiUsageSnapshot(keyHash: string): PublicApiUsageSnapshot {
  const rateLimitPerMin = getRateLimitPerMinute();
  const dailyQuota = getDailyQuota();

  const minuteKey = getMinuteKey(keyHash);
  const minuteResetAt = Math.ceil(Date.now() / 60000) * 60000;
  const minuteCount = minuteBuckets.get(minuteKey)?.count || 0;

  const dayKey = getDayKey(keyHash);
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  const dayResetAt = tomorrow.getTime();
  const dayCount = dayBuckets.get(dayKey)?.count || 0;

  return {
    minute: {
      limit: rateLimitPerMin,
      used: minuteCount,
      remaining: Math.max(0, rateLimitPerMin - minuteCount),
      resetAt: minuteResetAt,
    },
    day: {
      limit: dailyQuota,
      used: dayCount,
      remaining: Math.max(0, dailyQuota - dayCount),
      resetAt: dayResetAt,
    },
  };
}

export function requirePublicApiKey(req: Request, res: Response, next: NextFunction) {
  const providedKey = String(req.header('x-api-key') || req.query.api_key || '').trim();

  if (!providedKey) {
    return res.status(401).json({ success: false, error: 'x-api-key requis' });
  }

  const allowedKeys = getAllowedKeys();
  if (allowedKeys.length === 0 || !allowedKeys.includes(providedKey)) {
    return res.status(401).json({ success: false, error: 'API key invalide' });
  }

  const rateLimitPerMin = getRateLimitPerMinute();
  const dailyQuota = getDailyQuota();
  const keyHash = hashKey(providedKey);
  const keyAlias = `key_${keyHash.slice(0, 6)}`;

  const minuteKey = getMinuteKey(keyHash);
  const minuteResetAt = Math.ceil(Date.now() / 60000) * 60000;
  const minuteCounter = touchCounter(minuteBuckets, minuteKey, minuteResetAt);
  const minuteRemaining = Math.max(0, rateLimitPerMin - minuteCounter.count);

  res.setHeader('X-RateLimit-Limit-Minute', String(rateLimitPerMin));
  res.setHeader('X-RateLimit-Remaining-Minute', String(minuteRemaining));
  res.setHeader('X-RateLimit-Reset', String(minuteResetAt));

  if (minuteCounter.count > rateLimitPerMin) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit depasse pour cette API key',
    });
  }

  const dayKey = getDayKey(keyHash);
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  const dayCounter = touchCounter(dayBuckets, dayKey, tomorrow.getTime());
  const dailyRemaining = Math.max(0, dailyQuota - dayCounter.count);

  res.setHeader('X-Quota-Limit-Daily', String(dailyQuota));
  res.setHeader('X-Quota-Remaining-Daily', String(dailyRemaining));

  if (dayCounter.count > dailyQuota) {
    return res.status(429).json({
      success: false,
      error: 'Quota journalier depasse pour cette API key',
    });
  }

  (req as any).publicApi = { keyHash, keyAlias } satisfies PublicApiContext;
  return next();
}
