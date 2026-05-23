/**
 * Routes API Business Intelligence
 * /api/admin/business-intelligence/*
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { businessIntelligenceService } from '../services/businessIntelligence.service.js';
import type { AuthRequest } from '../middleware/auth.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

// Toutes les routes nécessitent authentification admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/business-intelligence/kpis
 * KPIs principaux
 */
router.get('/kpis', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const kpis = await businessIntelligenceService.getKPIs(
      period as 'day' | 'week' | 'month' | 'year'
    );
    res.json({
      success: true,
      data: kpis,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/business-intelligence/user-growth
 * Croissance utilisateurs
 */
router.get('/user-growth', async (req, res, next) => {
  try {
    const { months = '12' } = req.query;
    const growth = await businessIntelligenceService.getUserGrowth(parseInt(months as string, 10));
    res.json({
      success: true,
      data: growth,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/business-intelligence/revenue-by-service
 * Revenus par service
 */
router.get('/revenue-by-service', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const revenue = await businessIntelligenceService.getRevenueByService(
      period as 'day' | 'week' | 'month' | 'year'
    );
    res.json({
      success: true,
      data: revenue,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/business-intelligence/insights
 * Insights automatiques
 */
router.get('/insights', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query;
    const insights = await businessIntelligenceService.getInsights(parseInt(limit as string, 10));
    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/business-intelligence/geography
 * Analytics géographiques
 */
router.get('/geography', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const analytics = await businessIntelligenceService.getGeographyAnalytics(
      period as 'day' | 'week' | 'month' | 'year'
    );
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/business-intelligence/retention
 * Analytics de rétention
 */
router.get('/retention', async (req, res, next) => {
  try {
    const { months = '6' } = req.query;
    const retention = await businessIntelligenceService.getRetentionAnalytics(
      parseInt(months as string, 10)
    );
    res.json({
      success: true,
      data: retention,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/business-intelligence/insights
 * Générer un insight
 */
router.post('/insights', validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const {
      insight_type,
      title,
      description,
      severity,
      metric_value,
      metric_change,
      period_start,
      period_end,
    } = req.body;

    if (!insight_type || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Type, titre et description requis',
      });
    }

    const insight = await businessIntelligenceService.generateInsight({
      insight_type,
      title,
      description,
      severity,
      metric_value,
      metric_change,
      period_start: period_start ? new Date(period_start) : undefined,
      period_end: period_end ? new Date(period_end) : undefined,
    });

    res.json({
      success: true,
      data: insight,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
