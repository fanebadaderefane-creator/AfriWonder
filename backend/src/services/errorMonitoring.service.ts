/**
 * Monitoring des erreurs : stockage en mémoire, Sentry, webhook optionnel, exposition pour dashboards.
 */
import { logger } from '../utils/logger.js';

const MAX_STORED = 100;
const errors: Array<{
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  timestamp: string;
  userId?: string;
}> = [];

let errorsLast24h = 0;
let last24hReset = Date.now();

function resetCountIfNeeded() {
  const now = Date.now();
  if (now - last24hReset > 24 * 60 * 60 * 1000) {
    errorsLast24h = 0;
    last24hReset = now;
  }
}

export interface ErrorContext {
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  body?: unknown;
}

/**
 * Enregistre une erreur (appelé par le errorHandler).
 */
export async function captureError(error: Error & { statusCode?: number }, context: ErrorContext) {
  resetCountIfNeeded();
  errorsLast24h += 1;

  const entry = {
    message: error.message,
    stack: error.stack,
    path: context.path,
    method: context.method,
    statusCode: error.statusCode ?? context.statusCode ?? 500,
    timestamp: new Date().toISOString(),
    userId: context.userId,
  };

  errors.push(entry);
  if (errors.length > MAX_STORED) errors.shift();

  // Sentry (si DSN configuré)
  if (process.env.SENTRY_DSN) {
    try {
      const { captureError: sendToSentry } = await import('../config/sentry.js');
      sendToSentry(error, context);
    } catch (_) {}
  }

  const webhookUrl = process.env.ERROR_WEBHOOK_URL || process.env.ERROR_MONITORING_WEBHOOK;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'error',
          message: entry.message,
          path: entry.path,
          method: entry.method,
          statusCode: entry.statusCode,
          timestamp: entry.timestamp,
          ...(process.env.NODE_ENV === 'development' && { stack: entry.stack }),
        }),
      });
    } catch (e) {
      logger.warn('Error monitoring webhook failed', { url: webhookUrl, err: (e as Error).message });
    }
  }

  return entry;
}

/**
 * Résumé pour endpoint health/monitoring (admin ou outil).
 */
export function getErrorsSummary() {
  resetCountIfNeeded();
  return {
    countLast24h: errorsLast24h,
    lastErrors: errors.slice(-20).reverse(),
    storedTotal: errors.length,
  };
}

export default { captureError, getErrorsSummary };
