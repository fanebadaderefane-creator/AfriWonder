import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role?: string;
    account_suspended?: boolean;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token manquant' },
      });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET non configuré');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        account_suspended: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' },
      });
    }

    if ((user as any).account_suspended) {
      return res.status(403).json({
        success: false,
        error: { message: 'Compte suspendu. Contactez le support.' },
      });
    }
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      account_suspended: (user as any).account_suspended,
    };

    next();
  } catch (error) {
    logger.error('Erreur authentification', error);
    return res.status(401).json({
      success: false,
      error: { message: 'Token invalide' },
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
            userId: string;
          };

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              email: true,
              username: true,
            },
          });

          if (user) {
            req.user = {
              id: user.id,
              email: user.email,
              username: user.username,
            };
          }
        } catch (error) {
          // Token invalide, continuer sans authentification
          // Ne rien faire, juste continuer
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentification requise' },
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Accès réservé aux administrateurs' },
    });
  }
  next();
};

