import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import sellerAnalyticsService from '../services/sellerAnalytics.service.js';

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

export default router;
