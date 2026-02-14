import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import platformRevenueService from '../services/platformRevenue.service.js';
import featureFlagService from '../services/featureFlag.service.js';

/** Clés de feature flags pour modules Phase 2 (cachés au lancement, réactivables en 1 clic) */
const LAUNCH_FEATURE_KEYS = [
  'FEATURE_TRANSPORT', 'FEATURE_FOOD', 'FEATURE_TELEMEDECINE', 'FEATURE_REALESTATE',
  'FEATURE_INSURANCE', 'FEATURE_UTILITIES', 'FEATURE_TICKETING', 'FEATURE_SERVICES',
  'FEATURE_EDUCATION', 'FEATURE_JOBS', 'FEATURE_CIVIC', 'FEATURE_CROWDFUNDING',
  'FEATURE_MICROCREDIT', 'FEATURE_NEWS', 'FEATURE_OFFLINE', 'FEATURE_QRCODE',
];

const router = Router();

// Configuration publique de base de la plateforme
// GET /api/platform/config
router.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'AfriWonder',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// GET /api/platform/stats — Public, statistiques réelles pour Landing/About (sans auth)
router.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalVideos, totalCreators] = await Promise.all([
      prisma.user.count({ where: { account_suspended: false } }),
      prisma.video.count(),
      prisma.user.count({ where: { account_suspended: false, videos: { some: {} } } }),
    ]);
    res.json({
      success: true,
      data: { totalUsers, totalVideos, totalCreators },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/feature-flags — Public, pour le frontend (menu, visibilité modules)
router.get('/feature-flags', async (_req, res, next) => {
  try {
    const flags: Record<string, boolean> = {};
    for (const key of LAUNCH_FEATURE_KEYS) {
      flags[key] = await featureFlagService.isEnabled(key);
    }
    res.json({ success: true, data: flags });
  } catch (error: any) {
    next(error);
  }
});

// Toutes les routes sensibles ci-dessous nécessitent une authentification admin.

// GET /api/platform/revenue - Statistiques de revenus de la plateforme
router.get('/revenue', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await platformRevenueService.getRevenueStats(start, end);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/revenue/:type - Revenus par type
router.get('/revenue/:type', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const revenue = await platformRevenueService.getRevenueByType(
      type as 'video_tips' | 'live_gifts' | 'marketplace' | 'subscriptions' | 'ads' | 'gifts_tips',
      start,
      end
    );

    res.json({
      success: true,
      data: revenue,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/wallet - Wallet de la plateforme
router.get('/wallet', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const wallet = await platformRevenueService.getPlatformWallet();

    res.json({
      success: true,
      data: wallet,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;



