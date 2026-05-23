import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import analyticsService from '../services/analytics.service.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

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

// POST /api/analytics/video/record — enregistrer / incrémenter VideoAnalytics (vue, likes, etc.)
router.post('/video/record', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const { video_id, creator_id, views, likes, comments, shares, watch_time_minutes, engagement_rate, revenue } = req.body;
    if (!video_id || !creator_id) {
      return res.status(400).json({ success: false, error: 'video_id et creator_id requis' });
    }
    const analytics = await analyticsService.recordVideoAnalytics({
      video_id,
      creator_id,
      views: views ?? 1,
      likes: likes ?? 0,
      comments: comments ?? 0,
      shares: shares ?? 0,
      watch_time_minutes: watch_time_minutes ?? 0,
      engagement_rate: engagement_rate ?? 0,
      revenue: revenue ?? 0,
    });
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/analytics
router.post('/', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
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

