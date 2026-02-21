/**
 * Routes API AI Engine
 * /api/admin/ai-engine/*
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { aiEngineService } from '../services/aiEngine.service.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Toutes les routes nécessitent authentification admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/ai-engine/stats
 * Statistiques globales de l'AI Engine
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await aiEngineService.getEngineStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/ai-engine/models
 * Liste des modèles AI
 */
router.get('/models', async (req, res, next) => {
  try {
    const models = await aiEngineService.getModels();
    res.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/ai-engine/features
 * Fonctionnalités IA avec stats
 */
router.get('/features', async (req, res, next) => {
  try {
    const features = await aiEngineService.getAIFeatures();
    res.json({
      success: true,
      data: features,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/ai-engine/recommendations
 * Recommandations récentes
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;
    const recommendations = await aiEngineService.getRecentRecommendations(
      parseInt(limit as string, 10)
    );
    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/ai-engine/fraud-detections
 * Détections de fraude récentes
 */
router.get('/fraud-detections', async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;
    const detections = await aiEngineService.getRecentFraudDetections(
      parseInt(limit as string, 10)
    );
    res.json({
      success: true,
      data: detections,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/ai-engine/credit-scores
 * Scores de crédit récents
 */
router.get('/credit-scores', async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;
    const scores = await aiEngineService.getRecentCreditScores(parseInt(limit as string, 10));
    res.json({
      success: true,
      data: scores,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/ai-engine/models
 * Créer ou mettre à jour un modèle AI
 */
router.post('/models', async (req: AuthRequest, res, next) => {
  try {
    const { name, type, version, precision, latency_ms, status } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Nom et type requis',
      });
    }

    const model = await aiEngineService.upsertModel({
      name,
      type,
      version,
      precision,
      latency_ms,
      status,
    });

    res.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
