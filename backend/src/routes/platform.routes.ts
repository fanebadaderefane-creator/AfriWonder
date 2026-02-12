import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import platformRevenueService from '../services/platformRevenue.service.js';

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
      type as 'video_tips' | 'live_gifts' | 'marketplace' | 'subscriptions',
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



