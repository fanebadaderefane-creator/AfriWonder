import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { requireAnyAdmin, requireSuperAdmin, requireFinanceAdmin, requireDataAdmin } from '../middleware/adminRbac.js';
import adminService from '../services/admin.service.js';
import verificationService from '../services/verification.service.js';
import { getErrorsSummary } from '../services/errorMonitoring.service.js';
import backupService from '../services/backup.service.js';
import adminFinanceService from '../services/adminFinance.service.js';
import crowdfundingService from '../services/crowdfunding.service.js';
import adminAuditService from '../services/adminAudit.service.js';
import platformControlService from '../services/platformControl.service.js';
import { getPlatformHealth } from '../services/platformHealth.service.js';
import prisma from '../config/database.js';
import { addToBlacklist } from '../services/blacklist.service.js';
import * as amlService from '../services/aml.service.js';
import featureFlagService from '../services/featureFlag.service.js';

const router = Router();

function getClientMeta(req: AuthRequest) {
  return {
    ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    user_agent: req.headers['user-agent'],
  };
}

async function auditLog(req: AuthRequest, action: string, targetType?: string, targetId?: string, metadata?: Record<string, unknown>) {
  if (!req.user?.id) return;
  await adminAuditService.log({
    admin_id: req.user.id,
    action_type: action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ...getClientMeta(req),
  });
}

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const dashboard = await adminService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/users (pagination obligatoire, limit max 100)
router.get('/users', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await adminService.getUsers(page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { role } = req.body;
    const userId = param(req, 'id');
    const user = await adminService.updateUserRole(userId, role);
    await auditLog(req, 'update_user_role', 'user', userId, { role });
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { banType, reason, description, durationDays } = req.body;
    const userId = param(req, 'id');
    const ban = await adminService.banUser(userId, {
      banType,
      reason,
      description,
      durationDays,
      issuedBy: req.user!.id,
    });
    await auditLog(req, 'ban_user', 'user', userId, { banType, reason, durationDays });
    res.json({ success: true, data: ban });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/sellers
router.get('/sellers', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const search = req.query.search as string;
    const result = await adminService.getSellers(page, limit, status, search);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/sellers/:id/status
router.patch('/sellers/:id/status', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const id = param(req, 'id');
    const profile = await adminService.updateSellerStatus(id, status);
    await auditLog(req, 'update_seller_status', 'seller', id, { status });
    res.json({ success: true, data: profile });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/sellers/:id/verify
router.patch('/sellers/:id/verify', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { is_verified } = req.body;
    const id = param(req, 'id');
    const profile = await adminService.updateSellerVerified(id, !!is_verified);
    await auditLog(req, 'verification_approve', 'seller', id, { is_verified });
    res.json({ success: true, data: profile });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/verifications (KYC)
router.get('/verifications', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const result = await verificationService.listForAdmin(page, limit, status);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/verifications/:id
router.patch('/verifications/:id', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const status = req.body.status ?? (req.body.approved === true ? 'approved' : req.body.approved === false ? 'rejected' : undefined);
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status (approved/rejected) ou approved requis' });
    }
    const id = param(req, 'id');
    const data = await verificationService.updateStatusByAdmin(id, req.user!.id, {
      status: status as 'approved' | 'rejected',
      set_seller_verified: req.body.set_seller_verified,
    });
    await auditLog(req, status === 'approved' ? 'verification_approve' : 'verification_reject', 'verification', id);
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/products (modération)
router.get('/products', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const seller_id = req.query.seller_id as string;
    const search = req.query.search as string;
    const result = await adminService.getProducts(page, limit, status, seller_id, search);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/products/:id/status
router.patch('/products/:id/status', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const id = param(req, 'id');
    const product = await adminService.updateProductStatus(id, status);
    await auditLog(req, 'update_product_status', 'product', id, { status });
    res.json({ success: true, data: product });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/disputes
router.get('/disputes', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const result = await adminService.getDisputes(page, limit, status);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/orders
router.get('/orders', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const result = await adminService.getAllOrders(page, limit, status);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/monitoring/errors — Résumé des erreurs (monitoring)
router.get('/monitoring/errors', authenticate, requireAnyAdmin, (req, res) => {
  try {
    res.json({ success: true, ...getErrorsSummary() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/backup/export — Export des données critiques (JSON)
router.get('/backup/export', authenticate, requireDataAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const data = await backupService.exportCriticalData({ from, to });
    await auditLog(req, 'export_data', 'platform', undefined, { type: 'backup', from, to });
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(data);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/backup/trigger — Écrit un fichier backup dans BACKUP_DIR (pour cron)
router.post('/backup/trigger', authenticate, requireDataAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = req.body?.from as string;
    const to = req.body?.to as string;
    const filepath = await backupService.writeBackupToFile({ from, to });
    await auditLog(req, 'export_data', 'platform', undefined, { type: 'backup_trigger', filepath });
    res.json({ success: true, filepath, message: 'Sauvegarde écrite' });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/export/transactions
router.get('/export/transactions', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = (req.query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);
    const data = await adminService.exportTransactions(from, to);
    await auditLog(req, 'export_data', 'transaction', undefined, { from, to });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/finance/dashboard - Dashboard fintech (wallets, microcrédit, crowdfunding, retraits)
router.get('/finance/dashboard', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = await adminFinanceService.getFinanceDashboard();
    const topTransactions = await adminFinanceService.getTopTransactions(10);
    res.json({ success: true, data: { ...data, topTransactions } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/wallets/:id/freeze — Geler un wallet (finance_admin)
router.post('/wallets/:id/freeze', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const walletId = param(req, 'id');
    const wallet = await adminFinanceService.freezeWallet(walletId);
    await auditLog(req, 'freeze_wallet', 'wallet', walletId);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/wallets/:id/unfreeze
router.post('/wallets/:id/unfreeze', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const walletId = param(req, 'id');
    const wallet = await adminFinanceService.unfreezeWallet(walletId);
    await auditLog(req, 'unfreeze_wallet', 'wallet', walletId);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/health — Platform Health (temps réel)
router.get('/health', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const health = await getPlatformHealth();
    res.json({ success: true, data: health });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/kill-switch — État du kill switch (super_admin uniquement pour modifier)
router.get('/kill-switch', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const state = await platformControlService.getKillSwitchState();
    res.json({ success: true, data: state });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/kill-switch — Modifier (super_admin only)
router.patch('/kill-switch', authenticate, requireSuperAdmin, async (req: AuthRequest, res, next) => {
  try {
    const body = req.body;
    if (typeof body.marketplace_enabled === 'boolean') await platformControlService.setMarketplaceEnabled(body.marketplace_enabled);
    if (typeof body.payments_enabled === 'boolean') await platformControlService.setPaymentsEnabled(body.payments_enabled);
    if (typeof body.videos_enabled === 'boolean') await platformControlService.setVideosEnabled(body.videos_enabled);
    if (typeof body.ride_enabled === 'boolean') await platformControlService.setRideEnabled(body.ride_enabled);
    if (typeof body.food_enabled === 'boolean') await platformControlService.setFoodEnabled(body.food_enabled);
    if (typeof body.health_enabled === 'boolean') await platformControlService.setHealthEnabled(body.health_enabled);
    if (typeof body.insurance_enabled === 'boolean') await platformControlService.setInsuranceEnabled(body.insurance_enabled);
    if (typeof body.events_enabled === 'boolean') await platformControlService.setEventsEnabled(body.events_enabled);
    if (typeof body.maintenance_mode === 'boolean') await platformControlService.setMaintenanceMode(body.maintenance_mode);
    if (typeof body.emergency_mode === 'boolean') await platformControlService.setEmergencyMode(body.emergency_mode);
    await auditLog(req, 'kill_switch', 'platform', undefined, req.body);
    const state = await platformControlService.getKillSwitchState();
    res.json({ success: true, data: state });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/audit-logs — Journal d'audit (super_admin, admin, data_admin)
router.get('/audit-logs', authenticate, requireDataAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const result = await adminAuditService.list({
      page,
      limit,
      admin_id: req.query.admin_id as string,
      action_type: req.query.action_type as string,
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/analytics/strategic — Growth, retention, ARPU, conversion (data_admin)
router.get('/analytics/strategic', authenticate, requireDataAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const data = await adminService.getStrategicAnalytics({ from, to });
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/crowdfunding/:id/suspend - Suspendre une campagne (fraud_flag optionnel)
router.post('/crowdfunding/:id/suspend', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaignId = param(req, 'id');
    const { reason, fraudFlag } = req.body;
    const result = await crowdfundingService.suspendCampaign(campaignId, reason ?? 'Modération', !!fraudFlag);
    await auditLog(req, 'update_seller_status', 'crowdfunding', campaignId, { reason, fraudFlag });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/suspend - Suspendre / réactiver un compte
router.patch('/users/:id/suspend', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const { suspended, reason } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    const data: { account_suspended: boolean; suspended_at?: Date | null; suspended_reason?: string | null } = {
      account_suspended: !!suspended,
      suspended_at: suspended ? new Date() : null,
      suspended_reason: reason ?? null,
    };
    const updated = await prisma.user.update({ where: { id: userId }, data });
    await auditLog(req, suspended ? 'user_suspend' : 'user_unsuspend', 'user', userId, { reason });
    res.json({ success: true, data: { id: updated.id, account_suspended: updated.account_suspended } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/blacklist - Ajouter à la blacklist (user | device | ip)
router.post('/blacklist', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { type, value, reason, expires_at } = req.body;
    if (!type || !value || !['user', 'device', 'ip'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type (user|device|ip) et value requis' });
    }
    await addToBlacklist(type, value, { reason, createdBy: req.user!.id, expiresAt: expires_at ? new Date(expires_at) : undefined });
    await auditLog(req, 'blacklist_add', 'blacklist', undefined, { type, value });
    res.status(201).json({ success: true, message: 'Entrée ajoutée' });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/aml/flags - Transactions flaggées AML (pending)
router.get('/aml/flags', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const result = await amlService.listPendingFlags(page, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/feature-flags - Liste des feature flags
router.get('/feature-flags', authenticate, requireAnyAdmin, async (req, res, next) => {
  try {
    const list = await featureFlagService.listFlags();
    res.json({ success: true, data: list });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/feature-flags/:key - Activer/désactiver un flag
router.patch('/feature-flags/:key', authenticate, requireSuperAdmin, async (req: AuthRequest, res, next) => {
  try {
    const key = param(req, 'key');
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled (boolean) requis' });
    await featureFlagService.setFlag(key, enabled);
    res.json({ success: true, data: { key, enabled } });
  } catch (error: any) {
    next(error);
  }
});

export default router;

