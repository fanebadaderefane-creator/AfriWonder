import { NextFunction, Request, Response } from 'express';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { AuthRequest } from './auth.js';

type CacheOptions = {
  ttlMs?: number;
  byUser?: boolean;
};

export const responseCache = (keyPrefix: string, options: CacheOptions = {}) => {
  const ttlMs = options.ttlMs ?? 30_000;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const authReq = req as AuthRequest;
    const authHeader = String(req.headers.authorization || '');
    const userSegment =
      options.byUser
        ? authReq.user?.id
          ? `:u:${authReq.user.id}`
          : authHeader.startsWith('Bearer ')
            ? `:t:${authHeader.slice(0, 24)}`
            : ''
        : '';
    const cacheKey = `${keyPrefix}${userSegment}:${req.originalUrl}`;

    try {
      const cached = await cacheGet<unknown>(cacheKey);
      if (cached != null) {
        return res.json(cached);
      }
    } catch {
      // do nothing, fallback to normal flow
    }

    const originalJson = res.json.bind(res);
    res.json = ((payload: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(cacheKey, payload, ttlMs).catch(() => {});
      }
      return originalJson(payload);
    }) as Response['json'];

    next();
  };
};

