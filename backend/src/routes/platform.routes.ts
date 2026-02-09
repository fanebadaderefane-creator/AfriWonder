import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import platformRevenueService from '../services/platformRevenue.service.js';

const router = Router();

// Toutes les routes nécessitent une authentification admin
// TODO: Ajouter un middleware isAdmin pour vérifier que l'utilisateur est admin

// GET /api/platform/revenue - Statistiques de revenus de la plateforme
router.get('/revenue', authenticate, async (req: AuthRequest, res, next) => {
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
router.get('/revenue/:type', authenticate, async (req: AuthRequest, res, next) => {
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
router.get('/wallet', authenticate, async (req: AuthRequest, res, next) => {
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

