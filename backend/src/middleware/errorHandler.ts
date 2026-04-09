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
  const message = isDbConnectionError
    ? 'Service temporairement indisponible. Réessayez dans quelques instants.'
    : rawMessage;

  const isProduction = process.env.NODE_ENV === 'production';
  const hideInternalDetails =
    isProduction &&
    effectiveStatusCode >= 500 &&
    err.isOperational !== true &&
    !isDbConnectionError;
  const clientSafeMessage = hideInternalDetails
    ? 'Une erreur interne est survenue. Réessayez plus tard.'
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

  res.status(effectiveStatusCode).json({
    success: false,
    error: {
      message: clientSafeMessage,
      ...(isDbConnectionError && { code: 'DATABASE_UNAVAILABLE' }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};

