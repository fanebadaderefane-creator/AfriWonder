import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import { requireAnyAdmin, requireSuperAdmin, requireFinanceAdmin, requireDataAdmin } from '../middleware/adminRbac.js';
import adminService from '../services/admin.service.js';
import verificationService from '../services/verification.service.js';
import { getErrorsSummary } from '../services/errorMonitoring.service.js';
import { getHttpMetricsSummary } from '../services/httpMetrics.service.js';
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
import commissionSettingsService from '../services/commissionSettings.service.js';
import * as monetizationService from '../services/monetization.service.js';
import { invalidateBannedWordsCache } from '../services/bannedWord.service.js';
import experimentService from '../services/experiment.service.js';
import e2eeService from '../services/e2ee.service.js';
import withdrawalService from '../services/withdrawal.service.js';
import notificationService from '../services/notification.service.js';
import liveService from '../services/live.service.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';
import {
  adminBackupTriggerBodySchema,
  adminBanUserBodySchema,
  adminBannedWordBodySchema,
  adminBannedWordPatchBodySchema,
  adminBlacklistBodySchema,
  adminCommissionConfigBodySchema,
  adminCrowdfundingSuspendBodySchema,
  adminExperimentCreateBodySchema,
  adminFeatureFlagBodySchema,
  adminKillSwitchBodySchema,
  adminLogisticsRateCreateBodySchema,
  adminLogisticsRateUpdateBodySchema,
  adminMonetizationRejectBodySchema,
  adminPickupPointCreateBodySchema,
  adminPickupPointUpdateBodySchema,
  adminProductStatusBodySchema,
  adminSellerStatusBodySchema,
  adminSellerVerifyBodySchema,
  adminUserRoleBodySchema,
  adminUserSuspendBodySchema,
  adminVerificationPatchBodySchema,
} from '../schemas/videosCommentsAdmin.schemas.js';

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

async function getAdminSettingsSnapshot() {
  const killSwitch = await platformControlService.getKillSwitchState();
  const featureFlags = await featureFlagService.listFlags();
  const commissionConfig = commissionSettingsService.getEffectiveConfig();
  const rawSettings = await prisma.platformSettings.findMany({
    where: {
      key: {
        in: [
          'maintenance_message',
          'promotion_banner',
          'min_withdrawal_fcfa',
        ],
      },
    },
  });
  const getJsonValue = (key: string) => rawSettings.find((row) => row.key === key)?.value;
  return {
    killSwitch,
    featureFlags,
    commissions: commissionConfig,
    maintenance_message: getJsonValue('maintenance_message') ?? null,
    promotion_banner: getJsonValue('promotion_banner') ?? null,
    min_withdrawal_fcfa: getJsonValue('min_withdrawal_fcfa') ?? 5000,
  };
}

async function safePendingReportsCount() {
  try {
    return await prisma.moderation.count({ where: { status: 'pending' } });
  } catch {
    return 0;
  }
}

async function safeActiveLives(page: number, limit: number) {
  try {
    return await liveService.listStreams(page, limit, { status: 'live' });
  } catch {
    return {
      streams: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
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

// GET /api/admin/analytics/overview
router.get('/analytics/overview', authenticate, requireAnyAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const dashboard = await adminService.getDashboard();
    const pendingWithdrawals = await withdrawalService.getPendingWithdrawals(1, 10);
    const activeLives = await safeActiveLives(1, 10);
    const pendingReports = await safePendingReportsCount();
    res.json({
      success: true,
      data: {
        ...dashboard,
        alerts: {
          pending_reports: pendingReports,
          pending_withdrawals: pendingWithdrawals.pagination.total,
          active_lives: activeLives.pagination.total,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/analytics/realtime
router.get('/analytics/realtime', authenticate, requireAnyAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const [activeLives, pendingReports, pendingWithdrawals] = await Promise.all([
      safeActiveLives(1, 20),
      safePendingReportsCount(),
      withdrawalService.getPendingWithdrawals(1, 20),
    ]);
    res.json({
      success: true,
      data: {
        generated_at: new Date().toISOString(),
        active_lives: activeLives.pagination.total,
        pending_reports: pendingReports,
        pending_withdrawals: pendingWithdrawals.pagination.total,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/analytics/users?period=7d
router.get('/analytics/users', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = await adminService.getAnalyticsUsers(String(req.query.period || '7d'));
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/analytics/revenue?period=30d
router.get('/analytics/revenue', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = await adminService.getAnalyticsRevenue(String(req.query.period || '30d'));
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/analytics/content?period=7d
router.get('/analytics/content', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = await adminService.getAnalyticsContent(String(req.query.period || '7d'));
    res.json({ success: true, data });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/users (pagination obligatoire, limit max 100)
// ?includeTest=true pour inclure les utilisateurs de test (@example.com, E2E, etc.)
router.get('/users', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const includeTest = req.query.includeTest === 'true' || req.query.includeTest === '1';
    const result = await adminService.getUsers(page, limit, { includeTest });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: param(req, 'id') },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        is_verified: true,
        account_suspended: true,
        suspended_reason: true,
        created_at: true,
        country: true,
        phone_verified: true,
        monetization_enabled: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', authenticate, requireAnyAdmin, validateBody(adminUserRoleBodySchema), async (req: AuthRequest, res, next) => {
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

// PUT /api/admin/users/:id/restore
router.put('/users/:id/restore', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = param(req, 'id');
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        account_suspended: false,
        suspended_at: null,
        suspended_reason: null,
      },
    });
    await auditLog(req, 'user_restore', 'user', userId);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', authenticate, requireAnyAdmin, validateBody(adminBanUserBodySchema), async (req: AuthRequest, res, next) => {
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

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', authenticate, requireAnyAdmin, validateBody(adminBanUserBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/sellers/:id/status', authenticate, requireAnyAdmin, validateBody(adminSellerStatusBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/sellers/:id/verify', authenticate, requireAnyAdmin, validateBody(adminSellerVerifyBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/verifications/:id', authenticate, requireAnyAdmin, validateBody(adminVerificationPatchBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/products/:id/status', authenticate, requireAnyAdmin, validateBody(adminProductStatusBodySchema), async (req: AuthRequest, res, next) => {
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

// GET /api/admin/transactions
router.get('/transactions', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const where: any = {};
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.method) where.payment_method = String(req.query.method);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/withdrawals
router.get('/withdrawals', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = String(req.query.status || 'pending');
    if (status === 'pending') {
      const result = await withdrawalService.getPendingWithdrawals(page, limit);
      return res.json({ success: true, data: result });
    }
    const skip = (page - 1) * limit;
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { status },
        include: {
          user: { select: { id: true, username: true, full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where: { status } }),
    ]);
    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/withdrawals/:id/approve
router.put('/withdrawals/:id/approve', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await withdrawalService.processWithdrawal(param(req, 'id'), req.user!.id, {
      transaction_reference: req.body?.transaction_reference,
      notes: req.body?.notes,
    });
    await auditLog(req, 'withdrawal_approve', 'withdrawal', param(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/withdrawals/:id/reject
router.put('/withdrawals/:id/reject', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await withdrawalService.cancelWithdrawal(param(req, 'id'), req.user!.id, true);
    await auditLog(req, 'withdrawal_reject', 'withdrawal', param(req, 'id'), {
      reason: req.body?.reason,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/transactions/:id/refund
router.post('/transactions/:id/refund', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: param(req, 'id') },
      data: { status: 'refunded' },
    });
    await auditLog(req, 'transaction_refund', 'transaction', transaction.id);
    res.json({ success: true, data: transaction });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/transactions/export
router.get('/transactions/export', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = (req.query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);
    const data = await adminService.exportTransactions(from, to);
    const rows = [
      ['id', 'type', 'status', 'amount', 'currency', 'payment_method', 'email', 'created_at'],
      ...data.map((tx) => [
        tx.id,
        tx.type,
        tx.status,
        tx.amount,
        tx.currency,
        tx.payment_method || '',
        tx.user?.email || '',
        tx.created_at.toISOString(),
      ]),
    ];
    const csv = rows
      .map((cols) => cols.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/monitoring/errors — Résumé des erreurs (monitoring)
// GET /api/admin/logistics/providers
router.get('/logistics/providers', authenticate, requireAnyAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const ratesByProvider = await prisma.shippingRate.groupBy({
      by: ['provider'],
      _count: { _all: true },
      where: { is_active: true },
    });

    const pickupPoints = await prisma.pickupPoint.findMany({
      where: { is_active: true },
      select: { id: true, name: true, city: true, country: true },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        providers: ratesByProvider.map((r) => ({
          name: r.provider,
          active_rates: r._count._all,
        })),
        pickup_points: pickupPoints,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/logistics/rates
router.get('/logistics/rates', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const provider = (req.query.provider as string)?.trim();
    const country = (req.query.country as string)?.trim();
    const where: any = {};
    if (provider) where.provider = provider;
    if (country) where.destination_country = country.toUpperCase();

    const rates = await prisma.shippingRate.findMany({
      where,
      orderBy: [{ provider: 'asc' }, { destination_country: 'asc' }, { estimated_delivery_days: 'asc' }],
    });
    res.json({ success: true, data: rates });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/logistics/rates
router.post('/logistics/rates', authenticate, requireAnyAdmin, validateBody(adminLogisticsRateCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { provider, destination_country, base_cost, cost_per_kg, estimated_delivery_days, is_active } = req.body;

    const created = await prisma.shippingRate.create({
      data: {
        provider: String(provider).trim(),
        destination_country: String(destination_country).trim().toUpperCase(),
        base_cost,
        cost_per_kg,
        estimated_delivery_days,
        is_active: typeof is_active === 'boolean' ? is_active : true,
      },
    });
    await auditLog(req, 'create_shipping_rate', 'shipping_rate', created.id, {
      provider: created.provider,
      destination_country: created.destination_country,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/logistics/rates/:id
router.put('/logistics/rates/:id', authenticate, requireAnyAdmin, validateBody(adminLogisticsRateUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const current = await prisma.shippingRate.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Tarif logistique non trouve' });
    }

    const data: any = {};
    if (typeof req.body.provider === 'string' && req.body.provider.trim()) data.provider = req.body.provider.trim();
    if (typeof req.body.destination_country === 'string' && req.body.destination_country.trim()) {
      data.destination_country = req.body.destination_country.trim().toUpperCase();
    }
    if (req.body.base_cost !== undefined) {
      const v = Number(req.body.base_cost);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ success: false, error: 'base_cost invalide' });
      data.base_cost = v;
    }
    if (req.body.cost_per_kg !== undefined) {
      const v = Number(req.body.cost_per_kg);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ success: false, error: 'cost_per_kg invalide' });
      data.cost_per_kg = v;
    }
    if (req.body.estimated_delivery_days !== undefined) {
      const v = Number(req.body.estimated_delivery_days);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ success: false, error: 'estimated_delivery_days invalide' });
      data.estimated_delivery_days = v;
    }
    if (typeof req.body.is_active === 'boolean') data.is_active = req.body.is_active;

    const updated = await prisma.shippingRate.update({ where: { id }, data });
    await auditLog(req, 'update_shipping_rate', 'shipping_rate', id, data);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/logistics/pickup-points
router.get('/logistics/pickup-points', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const country = (req.query.country as string)?.trim();
    const city = (req.query.city as string)?.trim();
    const where: any = {};
    if (country) where.country = country.toUpperCase();
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const points = await prisma.pickupPoint.findMany({
      where,
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: points });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/logistics/pickup-points
router.post('/logistics/pickup-points', authenticate, requireAnyAdmin, validateBody(adminPickupPointCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, address, city, country, is_active } = req.body;

    const created = await prisma.pickupPoint.create({
      data: {
        name: String(name).trim(),
        address: String(address).trim(),
        city: String(city).trim(),
        country: String(country).trim().toUpperCase(),
        is_active: typeof is_active === 'boolean' ? is_active : true,
      },
    });
    await auditLog(req, 'create_pickup_point', 'pickup_point', created.id, {
      city: created.city,
      country: created.country,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/logistics/pickup-points/:id
router.put('/logistics/pickup-points/:id', authenticate, requireAnyAdmin, validateBody(adminPickupPointUpdateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const current = await prisma.pickupPoint.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Point relais non trouve' });
    }
    const data: any = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim();
    if (typeof req.body.address === 'string' && req.body.address.trim()) data.address = req.body.address.trim();
    if (typeof req.body.city === 'string' && req.body.city.trim()) data.city = req.body.city.trim();
    if (typeof req.body.country === 'string' && req.body.country.trim()) data.country = req.body.country.trim().toUpperCase();
    if (typeof req.body.is_active === 'boolean') data.is_active = req.body.is_active;

    const updated = await prisma.pickupPoint.update({ where: { id }, data });
    await auditLog(req, 'update_pickup_point', 'pickup_point', id, data);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(error);
  }
});

router.get('/monitoring/errors', authenticate, requireAnyAdmin, (req, res) => {
  try {
    res.json({ success: true, ...getErrorsSummary() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/monitoring/http — Metriques HTTP (latence, erreur, top routes)
router.get('/monitoring/http', authenticate, requireAnyAdmin, (req, res) => {
  try {
    res.json({ success: true, data: getHttpMetricsSummary() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/monitoring/e2ee — état E2EE (devices, prekeys, envelopes)
router.get('/monitoring/e2ee', authenticate, requireAnyAdmin, async (_req, res) => {
  try {
    const data = await e2eeService.getHealthSnapshot();
    res.json({ success: true, data });
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
router.post('/backup/trigger', authenticate, requireDataAdmin, validateBody(adminBackupTriggerBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/wallets/:id/freeze', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/wallets/:id/unfreeze', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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

// GET /api/admin/lives/active
router.get('/lives/active', authenticate, requireAnyAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const result = await safeActiveLives(1, 20);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/lives/history
router.get('/lives/history', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await liveService.listStreams(page, limit, { status: 'ended', sortBy: 'recent' });
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/lives/:id/terminate
router.post('/lives/:id/terminate', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: param(req, 'id') } });
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Live introuvable' });
    }
    const ended = await liveService.endStream(stream.id, stream.creator_id, {
      replay_url: stream.replay_url || null,
    });
    await auditLog(req, 'live_terminate', 'live', stream.id, { reason: req.body?.reason });
    res.json({ success: true, data: ended });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/lives/:id/replay
router.get('/lives/:id/replay', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const stream = await liveService.getStream(param(req, 'id'));
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Live introuvable' });
    }
    res.json({
      success: true,
      data: {
        id: stream.id,
        replay_url: stream.replay_url,
        replay_chapters: stream.replay_chapters || [],
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/lives/:id/stats
router.get('/lives/:id/stats', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const stream = await liveService.getStream(param(req, 'id'));
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Live introuvable' });
    }
    res.json({
      success: true,
      data: {
        viewers_count: stream.viewers_count,
        peak_viewers: stream.peak_viewers,
        total_likes: stream.total_likes,
        total_gifts_amount: stream.total_gifts_amount,
        duration_minutes: stream.duration_minutes,
      },
    });
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
router.patch('/kill-switch', authenticate, requireSuperAdmin, validateBody(adminKillSwitchBodySchema), async (req: AuthRequest, res, next) => {
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

// GET /api/admin/live-revenue-by-creator — Revenus live par créateur (gifts + tips)
router.get('/live-revenue-by-creator', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await adminService.getLiveRevenueByCreator({ from, to, page, limit });
    res.json({ success: true, data });
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

// GET /api/admin/analytics/strategic/export - Export KPI strategiques (CSV)
router.get('/analytics/strategic/export', authenticate, requireDataAdmin, async (req: AuthRequest, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const data = await adminService.getStrategicAnalytics({ from, to });

    const rows: Array<[string, string | number]> = [
      ['metric', 'value'],
      ['growthRatePct', data.growthRate ?? 0],
      ['newUsersLast7d', data.newUsersLast7d ?? 0],
      ['newUsersLast24h', data.newUsersLast24h ?? 0],
      ['userGrowthRate7dPct', data.userGrowthRate7d ?? 0],
      ['arpuXof', data.arpu ?? 0],
      ['conversionMarketplacePct', data.conversionMarketplace ?? 0],
      ['revenueLast30dXof', data.revenueLast30d ?? 0],
      ['transactionsLast24h', data.transactionsLast24h ?? 0],
      ['ordersCompleted', data.ordersCompleted ?? 0],
      ['ordersTotal', data.ordersTotal ?? 0],
      ['mau30d', data.mau ?? 0],
      ['retentionRate30dPct', data.retentionRate30d ?? 0],
      ['retentionRate90dPct', data.retentionRate90d ?? 0],
      ['newUsers30d', data.newUsers30d ?? 0],
      ['activatedUsers30d', data.activatedUsers30d ?? 0],
      ['activationRate30dPct', data.activationRate30d ?? 0],
      ['newUsers7d', data.newUsers7d ?? 0],
      ['activatedUsers7d', data.activatedUsers7d ?? 0],
      ['activationRate7dPct', data.activationRate7d ?? 0],
      ['cartsWithItemsLast7d', data.cartsWithItemsLast7d ?? 0],
      ['cartsConvertedLast7d', data.cartsConvertedLast7d ?? 0],
      ['abandonedCartsLast7d', data.abandonedCartsLast7d ?? 0],
      ['cartAbandonmentRate7dPct', data.cartAbandonmentRate7d ?? 0],
      ['paymentsAttempted30d', data.paymentsAttempted30d ?? 0],
      ['paymentsSuccess30d', data.paymentsSuccess30d ?? 0],
      ['paymentsFailed30d', data.paymentsFailed30d ?? 0],
      ['paymentSuccessRate30dPct', data.paymentSuccessRate30d ?? 0],
      ['sellersTotal', data.sellersTotal ?? 0],
      ['activeSellers30d', data.activeSellers30d ?? 0],
      ['avgProductsPerSeller', data.avgProductsPerSeller ?? 0],
      ['listingsCreated30d', data.listingsCreated30d ?? 0],
      ['soldListings30d', data.soldListings30d ?? 0],
      ['listingToSaleConversionRate30dPct', data.listingToSaleConversionRate30d ?? 0],
      ['avgOrderProcessingHours30d', data.avgOrderProcessingHours30d ?? 0],
      ['avgSellerRating', data.avgSellerRating ?? 0],
      ['gmv30dXof', data.gmv30d ?? 0],
      ['avgBasket30dXof', data.avgBasket30d ?? 0],
      ['visitors30d', data.visitors30d ?? 0],
      ['buyers30d', data.buyers30d ?? 0],
      ['visitorToBuyerConversionRate30dPct', data.visitorToBuyerConversionRate30d ?? 0],
      ['commissionRevenue30dXof', data.commissionRevenue30d ?? 0],
      ['subscriptionRevenue30dXof', data.subscriptionRevenue30d ?? 0],
      ['totalPlatformRevenue30dXof', data.totalPlatformRevenue30d ?? 0],
      ['nps30d', data.nps30d ?? 0],
      ['npsRespondents30d', data.npsRespondents30d ?? 0],
      ['npsNote', data.npsNote ?? ''],
      ['retentionNote', data.retentionNote ?? ''],
      ['ltvNote', data.ltvNote ?? ''],
    ];

    const csv = rows
      .map(([k, v]) => {
        const safe = String(v ?? '').replace(/"/g, '""');
        return `"${k}","${safe}"`;
      })
      .join('\n');

    await auditLog(req, 'export_data', 'analytics', undefined, { from, to, format: 'csv' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpi-strategic-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/crowdfunding/:id/suspend - Suspendre une campagne (fraud_flag optionnel)
router.post('/crowdfunding/:id/suspend', authenticate, requireAnyAdmin, validateBody(adminCrowdfundingSuspendBodySchema), async (req: AuthRequest, res, next) => {
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
router.patch('/users/:id/suspend', authenticate, requireAnyAdmin, validateBody(adminUserSuspendBodySchema), async (req: AuthRequest, res, next) => {
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
router.post('/blacklist', authenticate, requireAnyAdmin, validateBody(adminBlacklistBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { type, value, reason, expires_at } = req.body;
    await addToBlacklist(type, value, { reason, createdBy: req.user!.id, expiresAt: expires_at ? new Date(expires_at as string | number) : undefined });
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

// GET /api/admin/settings
router.get('/settings', authenticate, requireAnyAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const snapshot = await getAdminSettingsSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/admin/settings
router.put('/settings', authenticate, requireSuperAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body || {};
    if (body.featureFlags && typeof body.featureFlags === 'object') {
      for (const [key, enabled] of Object.entries(body.featureFlags)) {
        if (typeof enabled === 'boolean') {
          await featureFlagService.setFlag(key, enabled);
        }
      }
    }
    if (body.maintenance_message !== undefined) {
      await prisma.platformSettings.upsert({
        where: { key: 'maintenance_message' },
        create: { key: 'maintenance_message', value: body.maintenance_message ?? null },
        update: { value: body.maintenance_message ?? null },
      });
    }
    if (body.promotion_banner !== undefined) {
      await prisma.platformSettings.upsert({
        where: { key: 'promotion_banner' },
        create: { key: 'promotion_banner', value: body.promotion_banner ?? null },
        update: { value: body.promotion_banner ?? null },
      });
    }
    if (body.min_withdrawal_fcfa !== undefined) {
      await prisma.platformSettings.upsert({
        where: { key: 'min_withdrawal_fcfa' },
        create: { key: 'min_withdrawal_fcfa', value: body.min_withdrawal_fcfa },
        update: { value: body.min_withdrawal_fcfa },
      });
    }
    await auditLog(req, 'settings_update', 'platform', undefined, body);
    const snapshot = await getAdminSettingsSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/feature-flags/:key - Activer/désactiver un flag
router.patch('/feature-flags/:key', authenticate, requireSuperAdmin, validateBody(adminFeatureFlagBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const key = param(req, 'key');
    const { enabled } = req.body;
    await featureFlagService.setFlag(key, enabled);
    res.json({ success: true, data: { key, enabled } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/broadcast-notification
router.post('/broadcast-notification', authenticate, requireSuperAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const target = String(req.body?.target || 'all').trim();
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title et body requis' });
    }
    const userWhere =
      target === 'creators'
        ? { monetization_enabled: true }
        : target === 'admins'
          ? { role: { in: ['super_admin', 'admin', 'finance_admin', 'moderation_admin', 'support_admin', 'data_admin'] } }
          : {};
    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
      take: 5000,
    });
    for (const user of users) {
      await notificationService.create(user.id, {
        type: 'admin_message',
        title,
        message: body,
      });
    }
    await auditLog(req, 'broadcast_notification', 'notification', undefined, { target, count: users.length });
    res.json({ success: true, data: { target, delivered: users.length } });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/commissions/config - Configuration effective des commissions
router.get('/commissions/config', authenticate, requireFinanceAdmin, async (req: AuthRequest, res, next) => {
  try {
    await commissionSettingsService.ensureLoaded();
    res.json({
      success: true,
      data: {
        overrides: commissionSettingsService.getOverrides(),
        effective: commissionSettingsService.getEffectiveConfig(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/admin/commissions/config - Mettre a jour les overrides commissions
router.patch('/commissions/config', authenticate, requireFinanceAdmin, validateBody(adminCommissionConfigBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { overrides, merge } = req.body;
    const effective = await commissionSettingsService.updateOverrides(overrides, merge !== false);
    await auditLog(req, 'change_commission', 'platform', undefined, { overrides, merge: merge !== false });
    res.json({
      success: true,
      data: {
        overrides: commissionSettingsService.getOverrides(),
        effective,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/commissions/config/reset - Reinitialiser les overrides
router.post('/commissions/config/reset', authenticate, requireFinanceAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const effective = await commissionSettingsService.resetOverrides();
    await auditLog(req, 'change_commission', 'platform', undefined, { action: 'reset' });
    res.json({
      success: true,
      data: {
        overrides: {},
        effective,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/admin/monetization-requests - Demandes de monétisation en attente
router.get('/monetization-requests', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const requests = await monetizationService.getPendingMonetizationRequests();
    res.json({ success: true, data: requests });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/monetization-requests/:id/approve - Approuver une demande
router.post('/monetization-requests/:id/approve', authenticate, requireAnyAdmin, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const result = await monetizationService.approveMonetizationRequest(id, req.user!.id);
    await auditLog(req, 'monetization_approve', 'monetization_request', id);
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/monetization-requests/:id/reject - Rejeter une demande
router.post('/monetization-requests/:id/reject', authenticate, requireAnyAdmin, validateBody(adminMonetizationRejectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { reason } = req.body || {};
    const result = await monetizationService.rejectMonetizationRequest(id, req.user!.id, reason);
    await auditLog(req, 'monetization_reject', 'monetization_request', id, { reason });
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    next(error);
  }
});

// ——— Mots interdits (CPO 2.43) ———
// GET /api/admin/banned-words
router.get('/banned-words', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const list = await prisma.bannedWord.findMany({
      orderBy: { word: 'asc' },
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/banned-words — body: { word: string }
router.post('/banned-words', authenticate, requireAnyAdmin, validateBody(adminBannedWordBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const word = String(req.body.word).trim().toLowerCase();
    const created = await prisma.bannedWord.upsert({
      where: { word },
      create: { word, is_active: true },
      update: { is_active: true },
    });
    await auditLog(req, 'banned_word_create', 'BannedWord', created.id, { word });
    invalidateBannedWordsCache();
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/admin/banned-words/:id
router.delete('/banned-words/:id', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    await prisma.bannedWord.delete({ where: { id } });
    await auditLog(req, 'banned_word_delete', 'BannedWord', id);
    invalidateBannedWordsCache();
    res.json({ success: true, message: 'Mot retiré' });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    next(error);
  }
});

// PATCH /api/admin/banned-words/:id — body: { is_active: boolean }
router.patch('/banned-words/:id', authenticate, requireAnyAdmin, validateBody(adminBannedWordPatchBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const id = param(req, 'id');
    const { is_active } = req.body;
    const updated = await prisma.bannedWord.update({
      where: { id },
      data: { is_active },
    });
    await auditLog(req, 'banned_word_update', 'BannedWord', id, { is_active });
    invalidateBannedWordsCache();
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ success: false, error: { message: 'Non trouvé' } });
    next(error);
  }
});

// CPO 11.36 — A/B testing : liste des expériences
router.get('/experiments', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const list = await experimentService.listAdmin();
    res.json({ success: true, data: list });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/admin/experiments — créer une expérience (key, name, description, variants: [{ variant_key, traffic_pct, config? }])
router.post('/experiments', authenticate, requireAnyAdmin, validateBody(adminExperimentCreateBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { key, name, description, variants } = req.body;
    const experiment = await experimentService.createAdmin({ key, name, description, variants: variants || [] });
    await auditLog(req, 'experiment_create', 'Experiment', experiment.id, { key: experiment.key });
    res.status(201).json({ success: true, data: experiment });
  } catch (error: any) {
    if (error?.statusCode === 400) return res.status(400).json({ success: false, error: { message: error.message } });
    next(error);
  }
});

export default router;
