import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import redisClient from '../config/redis.js';

// Cache TTL: 30s — short enough to pick up suspensions quickly, long enough to cut DB load.
const USER_CACHE_TTL_S = 30;
const USER_CACHE_PREFIX = 'auth:user:';

type CachedUser = { id: string; email: string; username: string; role: string; account_suspended: boolean };

async function getCachedUser(userId: string): Promise<CachedUser | null> {
  if (!redisClient) return null;
  try {
    const raw = await redisClient.get(`${USER_CACHE_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as CachedUser) : null;
  } catch {
    return null;
  }
}

async function setCachedUser(user: CachedUser): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(`${USER_CACHE_PREFIX}${user.id}`, JSON.stringify(user), { EX: USER_CACHE_TTL_S });
  } catch {
    // Non-fatal: skip cache write silently
  }
}

/** Invalidate cached user entry (call on suspension, role change, or logout). */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.del(`${USER_CACHE_PREFIX}${userId}`);
  } catch {
    // Non-fatal
  }
}

/** Bearer prioritaire, sinon cookie httpOnly `access_token` (navigateur + withCredentials). */
export function getAccessTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  const c = req.cookies?.access_token;
  if (typeof c === 'string' && c.trim()) return c.trim();
  return null;
}

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
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token manquant' },
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET non configuré');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Cache-first lookup: Redis (30s TTL) → DB. Avoids 1 DB query per authenticated request.
    let user: CachedUser | null = await getCachedUser(decoded.userId);
    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          account_suspended: true,
        },
      });
      if (dbUser) {
        user = dbUser as CachedUser;
        await setCachedUser(user);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' },
      });
    }

    if (user.account_suspended) {
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
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
          userId: string;
        };

        // Cache-first lookup: mirrors authenticate() — avoids DB hit on every optional-auth route.
        let user: CachedUser | null = await getCachedUser(decoded.userId);
        if (!user) {
          const dbUser = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
              account_suspended: true,
            },
          });
          if (dbUser) {
            user = dbUser as CachedUser;
            await setCachedUser(user);
          }
        }

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
          };
        }
      } catch (_error) {
        // Token invalide, continuer sans authentification
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

