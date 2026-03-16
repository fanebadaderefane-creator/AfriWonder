import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import prisma from '../config/database.js';
import sellerAnalyticsService from '../services/sellerAnalytics.service.js';
import loyaltyService from '../services/loyalty.service.js';
import productService from '../services/product.service.js';
import auctionService from '../services/auction.service.js';

const router = Router();

router.use(authenticate);

type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'custom';

// GET /api/seller/analytics — dashboard KPIs + comparaison + ventes par jour
router.get('/analytics', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const period = (req.query.period as PeriodKey) || '30d';
    const customStart = req.query.start ? new Date(req.query.start as string) : undefined;
    const customEnd = req.query.end ? new Date(req.query.end as string) : undefined;
    const data = await sellerAnalyticsService.getDashboard(sellerId, period, customStart, customEnd);
    res.json({ success: true, data });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/seller/analytics/products — top 10, faibles perfs, à booster
router.get('/analytics/products', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const period = (req.query.period as PeriodKey) || '30d';
    const customStart = req.query.start ? new Date(req.query.start as string) : undefined;
    const customEnd = req.query.end ? new Date(req.query.end as string) : undefined;
    const data = await sellerAnalyticsService.getProductAnalytics(sellerId, period, customStart, customEnd);
    res.json({ success: true, data });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/seller/analytics/insights — insights automatiques
router.get('/analytics/insights', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const period = (req.query.period as PeriodKey) || '30d';
    const data = await sellerAnalyticsService.getInsights(sellerId, period);
    res.json({ success: true, data });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/seller/analytics/geography — répartition pays
router.get('/analytics/geography', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const period = (req.query.period as PeriodKey) || '30d';
    const data = await sellerAnalyticsService.getGeography(sellerId, period);
    res.json({ success: true, data });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/seller/analytics/export — export CSV
router.get('/analytics/export', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const period = (req.query.period as PeriodKey) || '30d';
    const format = (req.query.format as string) || 'csv';
    const customStart = req.query.start ? new Date(req.query.start as string) : undefined;
    const customEnd = req.query.end ? new Date(req.query.end as string) : undefined;

    if (format === 'csv') {
      const csv = await sellerAnalyticsService.exportCsv(sellerId, period, customStart, customEnd);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="seller-analytics-${period}-${Date.now()}.csv"`);
      return res.send(csv);
    }
    res.status(400).json({ success: false, error: 'Format non supporté. Utilisez format=csv.' });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/seller/customers - CRM: acheteurs ayant commandé chez moi
router.get('/customers', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const grouped = await prisma.order.groupBy({
      by: ['user_id'],
      where: { seller_id: sellerId },
      _count: { id: true },
    });
    const total = grouped.length;
    const sorted = grouped.sort((a, b) => b._count.id - a._count.id);
    const paged = sorted.slice((page - 1) * limit, page * limit);
    const userIds = paged.map((g) => g.user_id);
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, full_name: true, profile_image: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const customers = paged.map((g) => ({ ...userMap[g.user_id], orders_count: g._count.id }));
    res.json({ success: true, data: { customers, total, page, limit } });
  } catch (e: any) {
    next(e);
  }
});

// CPO 10.21 — Programme fidélité (vendeur)
router.get('/loyalty', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const program = await loyaltyService.getOrCreateProgram(sellerId);
    res.json({ success: true, data: program });
  } catch (e: any) {
    next(e);
  }
});

router.put('/loyalty', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const { points_per_purchase, reward_threshold, reward_type, reward_value, is_active } = req.body;
    const program = await loyaltyService.updateProgram(sellerId, {
      points_per_purchase,
      reward_threshold,
      reward_type,
      reward_value,
      is_active,
    });
    res.json({ success: true, data: program });
  } catch (e: any) {
    next(e);
  }
});

// CPO 6.36 — Offres reçues (négociation prix)
router.get('/offers', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await productService.listOffersForSeller(sellerId, page, limit);
    res.json({ success: true, data: result.offers, pagination: result.pagination });
  } catch (e: any) {
    next(e);
  }
});

router.patch('/offers/:offerId', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const offerId = param(req, 'offerId');
    const { status, seller_note } = req.body;
    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'status requis: accepted ou declined' } });
    }
    const offer = await productService.respondToOffer(sellerId, offerId, status, seller_note);
    res.json({ success: true, data: offer });
  } catch (e: any) {
    next(e);
  }
});

// CPO 6.35 — Enchères : liste des enchères du vendeur
router.get('/auctions', async (req: AuthRequest, res, next) => {
  try {
    const sellerId = req.user!.id;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const result = await auctionService.listBySeller(sellerId, { status, page, limit });
    res.json({ success: true, data: result.auctions, pagination: result.pagination });
  } catch (e: any) {
    next(e);
  }
});

export default router;
