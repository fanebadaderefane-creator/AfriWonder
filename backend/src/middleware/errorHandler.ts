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
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const rawMessage = err.message || 'Internal Server Error';

  // Ne pas exposer les messages techniques DB (circuit breaker, upstream, P1001) au client
  const isDbConnectionError =
    /Circuit breaker|upstream database|Can't reach database|connection.*refused|ECONNREFUSED|P1001/i.test(rawMessage);
  const effectiveStatusCode =
    isDbConnectionError ? 503 : statusCode;
  let message = isDbConnectionError
    ? 'Service temporairement indisponible. Réessayez dans quelques instants.'
    : rawMessage;

  /** Colonne/table absente → schéma DB souvent en retard sur prisma/schema.prisma */
  const prismaCode = (err as { code?: string }).code;
  const prismaSchemaMismatch = prismaCode === 'P2022' || prismaCode === 'P2021';
  if (
    process.env.NODE_ENV === 'development' &&
    prismaSchemaMismatch &&
    !isDbConnectionError
  ) {
    message =
      `${rawMessage} — Cause fréquente : migrations non appliquées sur cette base. Dans backend/, exécutez « npx prisma migrate deploy » (prod/staging) ou « npx prisma migrate dev » (local), puis redémarrez le serveur API.`;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hideInternalDetails =
    isProduction &&
    effectiveStatusCode >= 500 &&
    err.isOperational !== true &&
    !isDbConnectionError;
  const clientSafeMessage = hideInternalDetails
    ? prismaSchemaMismatch
      ? 'Erreur serveur : schéma base de données incompatible (migrations Prisma à appliquer).'
      : 'Une erreur interne est survenue. Réessayez plus tard.'
    : message;

  logger.error(rawMessage, err, {
    path: req.path,
    method: req.method,
    statusCode: effectiveStatusCode,
  });

  // Monitoring : capture async (ne bloque pas la réponse)
  const userId = (req as any).user?.id;
  captureError(err, {
    path: req.path,
    method: req.method,
    statusCode: effectiveStatusCode,
    userId,
  }).catch(noop);

  function noop() {}

  const opCode = (err as AppError & { code?: string }).code;

  res.status(effectiveStatusCode).json({
    success: false,
    error: {
      message: clientSafeMessage,
      ...(isDbConnectionError && { code: 'DATABASE_UNAVAILABLE' }),
      ...(opCode && !isDbConnectionError ? { code: opCode } : {}),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};

