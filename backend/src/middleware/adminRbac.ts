/**
 * RBAC Admin — super_admin, admin, finance_admin, moderation_admin, support_admin, data_admin
 * super_admin : accès total (kill switch, audit, finance, modération, export, settings)
 * admin : dashboard, users, sellers, products, orders, disputes, verifications (pas kill switch ni audit complet)
 * finance_admin : dashboard finance, freeze wallet, refund, export transactions
 * moderation_admin : users (ban), sellers, products, disputes, modération
 * support_admin : disputes, support tickets, users (lecture)
 * data_admin : export, analytics, audit logs (lecture)
 */

import { AuthRequest } from './auth.js';

export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'finance_admin',
  'moderation_admin',
  'support_admin',
  'data_admin',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/** Accès au centre de contrôle (au moins un rôle admin) */
export function requireAnyAdmin(req: AuthRequest, res: any, next: any) {
  const role = req.user?.role;
  if (!role || !isAdminRole(role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

/** super_admin uniquement (kill switch, audit, settings sensibles) */
export function requireSuperAdmin(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super admin only' });
  }
  next();
}

/** Accès section Finance (super_admin ou finance_admin) */
export function requireFinanceAdmin(req: AuthRequest, res: any, next: any) {
  const role = req.user?.role;
  if (role !== 'super_admin' && role !== 'finance_admin' && role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Finance admin access required' });
  }
  next();
}

/** Accès section Modération (super_admin, admin, moderation_admin) */
export function requireModerationAdmin(req: AuthRequest, res: any, next: any) {
  const role = req.user?.role;
  if (role !== 'super_admin' && role !== 'admin' && role !== 'moderation_admin') {
    return res.status(403).json({ success: false, error: 'Moderation admin access required' });
  }
  next();
}

/** Accès export / analytics / audit (super_admin, admin, data_admin) */
export function requireDataAdmin(req: AuthRequest, res: any, next: any) {
  const role = req.user?.role;
  if (role !== 'super_admin' && role !== 'admin' && role !== 'data_admin') {
    return res.status(403).json({ success: false, error: 'Data admin access required' });
  }
  next();
}

export function canAccessKillSwitch(role: string): boolean {
  return role === 'super_admin';
}

export function canAccessAuditLogs(role: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'data_admin';
}

export function canAccessFinance(role: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'finance_admin';
}

export function canAccessModeration(role: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'moderation_admin';
}

export function canAccessSupport(role: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'support_admin';
}
