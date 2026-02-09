import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import analyticsService from '../services/analytics.service.js';

const router = Router();

// GET /api/analytics/video/:videoId
router.get('/video/:videoId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const analytics = await analyticsService.getVideoAnalytics(param(req, 'videoId'), startDate, endDate);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/analytics/creator/:creatorId
router.get('/creator/:creatorId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const result = await analyticsService.getCreatorAnalytics(param(req, 'creatorId'), startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/analytics/:entityType/:entityId
router.get('/:entityType/:entityId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const analytics = await analyticsService.getAnalytics(
      param(req, 'entityType'),
      param(req, 'entityId'),
      startDate,
      endDate
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/analytics
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { entityType, entityId, metricType, metricValue, metadata } = req.body;
    const analytics = await analyticsService.createAnalytics({
      userId: req.user!.id,
      entityType,
      entityId,
      metricType,
      metricValue,
      metadata,
    });
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    next(error);
  }
});

export default router;

