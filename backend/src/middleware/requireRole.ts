/**
 * RBAC — accès par rôle (admin | staff | partner | user)
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

const ROLES = ['admin', 'staff', 'partner', 'user'] as const;

export function requireRole(allowed: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    const role = req.user.role || 'user';
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé (rôle insuffisant)' });
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole(['admin'])(req, res, next);
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole(['admin', 'staff'])(req, res, next);
}
