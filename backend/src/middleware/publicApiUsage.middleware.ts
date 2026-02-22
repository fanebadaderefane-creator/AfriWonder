import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { getPublicApiContext } from './publicApiKey.middleware.js';

export function trackPublicApiUsage(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const ctx = getPublicApiContext(req);
    if (!ctx) return;

    const durationMs = Date.now() - startedAt;
    const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
    const statusCode = res.statusCode;

    prisma.analytics.create({
      data: {
        user_id: null,
        entity_type: 'public_api',
        entity_id: ctx.keyHash,
        metric_type: 'public_api_call',
        metric_value: 1,
        metadata: {
          keyAlias: ctx.keyAlias,
          endpoint,
          statusCode,
          durationMs,
          userAgent: req.get('user-agent') || null,
        } as any,
      },
    }).catch(() => {});
  });

  return next();
}

