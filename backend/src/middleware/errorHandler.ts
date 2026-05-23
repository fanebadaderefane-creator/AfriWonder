// AfriWonder full review PR - CodeRabbit
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { captureError } from '../services/errorMonitoring.service.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const rawMessage = err.message || 'Internal Server Error';

  // Ne pas exposer les messages techniques DB (circuit breaker, upstream, P1001) au client
  const isDbConnectionError =
    /Circuit breaker|upstream database|Can't reach database|connection.*refused|ECONNREFUSED|P1001/i.test(rawMessage);
  const effectiveStatusCode = isDbConnectionError ? 503 : statusCode;
  let message = isDbConnectionError
    ? 'Service temporairement indisponible. Réessayez dans quelques instants.'
    : rawMessage;

  /** Colonne/table absente → schéma DB souvent en retard sur prisma/schema.prisma */
  const prismaCode = (err as { code?: string }).code;
  const prismaSchemaMismatch = prismaCode === 'P2022' || prismaCode === 'P2021';
  if (process.env.NODE_ENV === 'development' && prismaSchemaMismatch && !isDbConnectionError) {
    message = `${rawMessage} — Cause fréquente : migrations non appliquées sur cette base. Dans backend/, exécutez « npx prisma migrate deploy » (prod/staging) ou « npx prisma migrate dev » (local), puis redémarrez le serveur API.`;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hideInternalDetails =
    isProduction && effectiveStatusCode >= 500 && err.isOperational !== true && !isDbConnectionError;
  const clientSafeMessage = hideInternalDetails
    ? 'Une erreur est survenue. Réessayez dans quelques instants.'
    : message;

  const isClientError = effectiveStatusCode >= 400 && effectiveStatusCode < 500;
  if (isClientError) {
    logger.warn(rawMessage, {
      path: req.path,
      method: req.method,
      statusCode: effectiveStatusCode,
    });
  } else {
    logger.error(rawMessage, err, {
      path: req.path,
      method: req.method,
      statusCode: effectiveStatusCode,
    });
  }

  // Réduit le bruit Sentry: on garde surtout les erreurs serveur (5xx).
  const shouldCaptureMonitoring = !isClientError || effectiveStatusCode === 429;
  if (shouldCaptureMonitoring) {
    const userId = (req as { user?: { id?: string } }).user?.id;
    captureError(err, {
      path: req.path,
      method: req.method,
      statusCode: effectiveStatusCode,
      userId,
    }).catch(() => {});
  }

  const opCode = (err as AppError & { code?: string }).code;
  res.status(effectiveStatusCode).json({
    success: false,
    error: {
      message: clientSafeMessage,
      ...(isDbConnectionError && { code: 'DATABASE_UNAVAILABLE' }),
      ...(opCode && !isDbConnectionError && !hideInternalDetails ? { code: opCode } : {}),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

