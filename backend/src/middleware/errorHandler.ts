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

  logger.error(rawMessage, err, {
    path: req.path,
    method: req.method,
    statusCode,
  });

  // Ne pas exposer les messages techniques DB (circuit breaker, upstream, P1001) au client
  const isDbConnectionError =
    statusCode === 500 &&
    /Circuit breaker|upstream database|Can't reach database|connection.*refused|ECONNREFUSED|P1001/i.test(rawMessage);
  const message = isDbConnectionError
    ? 'Service temporairement indisponible. Réessayez dans quelques instants.'
    : rawMessage;

  // Monitoring : capture async (ne bloque pas la réponse)
  const userId = (req as any).user?.id;
  captureError(err, {
    path: req.path,
    method: req.method,
    statusCode,
    userId,
  }).catch(noop);

  function noop() {}

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};

