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
  const message = err.message || 'Internal Server Error';

  logger.error(message, err, {
    path: req.path,
    method: req.method,
    statusCode,
  });

  // Monitoring : capture async (ne bloque pas la réponse)
  const userId = (req as any).user?.id;
  captureError(err, {
    path: req.path,
    method: req.method,
    statusCode,
    userId,
  }).catch(() => {});

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

