import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import onHeaders from 'on-headers';
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

  onHeaders(res, () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const durationMs = Number(elapsedNs) / 1_000_000;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
  });

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

    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const critical =
      rawPath === '/health' ||
      /^\/api\/health$/.test(rawPath) ||
      /^\/api\/auth\/(login|refresh)$/.test(rawPath) ||
      /^\/api\/videos\/feed\b/.test(rawPath);

    if (critical && durationMs > 200) {
      logger.warn('SLA audit (>200ms) route critique', {
        method: req.method,
        path: rawPath,
        duration_ms: Number(durationMs.toFixed(2)),
        requestId: (req as any).requestId,
      });
    } else if (durationMs >= 1200 && req.path.startsWith('/api/')) {
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
  return (
    path.startsWith('/api/upload') ||
    path.startsWith('/api/proxy/upload') ||
    /\/webhook$/i.test(path) ||
    // Transcodage ffmpeg (H.264 web) : souvent > 30 s — ne pas couper la socket (sinon proxy Vite « socket hang up » / 500)
    path.includes('/repair-web-playback')
  );
}

export const apiRequestTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/') || isLongRunningPath(req.path)) return next();
  res.setTimeout(API_REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) (req.socket as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
  });
  next();
};
