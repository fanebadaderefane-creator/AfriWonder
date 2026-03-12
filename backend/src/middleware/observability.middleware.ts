import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { recordHttpMetric } from '../services/httpMetrics.service.js';
import { logger } from '../utils/logger.js';

function normalizePath(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  const existing = (req.headers['x-request-id'] as string) || '';
  const requestId = existing.trim() || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const durationMs = Number(elapsedNs) / 1_000_000;
    const path = normalizePath(req.baseUrl ? `${req.baseUrl}${req.path}` : req.path);

    recordHttpMetric({
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
    });

    if (durationMs >= 1200 && req.path.startsWith('/api/')) {
      logger.warn('Slow API request detected', {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration_ms: Number(durationMs.toFixed(2)),
        requestId: (req as any).requestId,
      });
    }
  });

  next();
};

/** Timeout des requêtes API (hors upload/webhooks) pour éviter requêtes bloquées — stabilité / consolidation. */
const API_REQUEST_TIMEOUT_MS = 30000; // 30s

function isLongRunningPath(path: string): boolean {
  return path.startsWith('/api/upload') || /\/webhook$/i.test(path);
}

export const apiRequestTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/') || isLongRunningPath(req.path)) return next();
  res.setTimeout(API_REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) (req.socket as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
  });
  next();
};
