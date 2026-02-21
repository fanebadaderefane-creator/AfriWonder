/**
 * AI Engine Service
 * Moteur d'intelligence central - Gestion des modèles ML, prédictions, recommandations
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export class AIEngineService {
  /**
   * Obtenir les statistiques globales de l'AI Engine
   */
  async getEngineStats() {
    try {
      const [models, predictions, recommendations] = await Promise.all([
        prisma.aIModel.count({ where: { status: 'active' } }),
        prisma.aIPrediction.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
            },
          },
        }),
        prisma.aIRecommendation.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      // Calculer précision moyenne et latence moyenne
      const activeModels = await prisma.aIModel.findMany({
        where: { status: 'active' },
        select: { precision: true, latency_ms: true },
      });

      const avgPrecision =
        activeModels.length > 0
          ? activeModels.reduce((sum, m) => sum + m.precision, 0) / activeModels.length
          : 0;

      const avgLatency =
        activeModels.length > 0
          ? activeModels.reduce((sum, m) => sum + m.latency_ms, 0) / activeModels.length
          : 0;

      return {
        totalPredictions: predictions,
        avgPrecision: Math.round(avgPrecision * 10) / 10, // 1 décimale
        avgLatency: Math.round(avgLatency),
        totalModels: models,
        totalRecommendations: recommendations,
      };
    } catch (error: any) {
      logger.error('Error getting AI engine stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir tous les modèles AI avec leurs stats
   */
  async getModels() {
    try {
      const models = await prisma.aIModel.findMany({
        orderBy: { created_at: 'desc' },
      });

      // Pour chaque modèle, compter prédictions récentes
      const modelsWithStats = await Promise.all(
        models.map(async (model) => {
          const recentPredictions = await prisma.aIPrediction.count({
            where: {
              model_id: model.id,
              created_at: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
              },
            },
          });

          return {
            ...model,
            recentPredictions,
          };
        })
      );

      return modelsWithStats;
    } catch (error: any) {
      logger.error('Error getting AI models', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les fonctionnalités IA avec leurs stats
   */
  async getAIFeatures() {
    try {
      const features = [
        {
          id: 'product_recommendation',
          name: 'Product Recommendation',
          icon: 'shopping-cart',
          description: 'Recommandations personnalisées basées sur historique et préférences',
          type: 'recommendation',
          status: 'active',
        },
        {
          id: 'ad_optimization',
          name: 'Ad Optimization',
          icon: 'trending-up',
          description: 'Optimisation automatique des publicités pour meilleur ROI',
          type: 'recommendation',
          status: 'active',
        },
        {
          id: 'microcredit_scoring',
          name: 'Microcredit Scoring',
          icon: 'credit-card',
          description: 'Score de crédit basé sur comportement transactionnel',
          type: 'scoring',
          status: 'active',
        },
        {
          id: 'fraud_detection',
          name: 'Fraud Detection',
          icon: 'shield',
          description: 'Détection temps réel des transactions suspectes',
          type: 'fraud_detection',
          status: 'active',
        },
        {
          id: 'live_moderation',
          name: 'Live Moderation',
          icon: 'mic',
          description: 'Modération automatique du contenu live',
          type: 'moderation',
          status: 'active',
        },
        {
          id: 'dynamic_pricing',
          name: 'Dynamic Pricing',
          icon: 'dollar-sign',
          description: 'Ajustement dynamique des prix selon demande et concurrence',
          type: 'pricing',
          status: 'beta',
        },
      ];

      // Enrichir avec stats réelles
      const featuresWithStats = await Promise.all(
        features.map(async (feature) => {
          const model = await prisma.aIModel.findFirst({
            where: { type: feature.type },
            orderBy: { created_at: 'desc' },
          });

          let precision = 0;
          if (model) {
            precision = model.precision;
          } else {
            // Valeurs par défaut si pas de modèle
            const defaultPrecisions: Record<string, number> = {
              recommendation: 94,
              scoring: 91,
              fraud_detection: 97,
              moderation: 85,
              pricing: 82,
            };
            precision = defaultPrecisions[feature.type] || 0;
          }

          return {
            ...feature,
            precision: Math.round(precision),
          };
        })
      );

      return featuresWithStats;
    } catch (error: any) {
      logger.error('Error getting AI features', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les recommandations récentes
   */
  async getRecentRecommendations(limit: number = 50) {
    try {
      const recommendations = await prisma.aIRecommendation.findMany({
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          model: {
            select: {
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              profile_image: true,
            },
          },
        },
      });

      return recommendations;
    } catch (error: any) {
      logger.error('Error getting recent recommendations', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les détections de fraude récentes
   */
  async getRecentFraudDetections(limit: number = 50) {
    try {
      const detections = await prisma.aIFraudDetection.findMany({
        take: limit,
        orderBy: { created_at: 'desc' },
        where: {
          status: { in: ['pending', 'reviewed'] },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return detections;
    } catch (error: any) {
      logger.error('Error getting recent fraud detections', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les scores de crédit récents
   */
  async getRecentCreditScores(limit: number = 50) {
    try {
      const scores = await prisma.aICreditScore.findMany({
        take: limit,
        orderBy: { last_calculated_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return scores;
    } catch (error: any) {
      logger.error('Error getting recent credit scores', { error: error.message });
      throw error;
    }
  }

  /**
   * Créer ou mettre à jour un modèle AI
   */
  async upsertModel(data: {
    name: string;
    type: string;
    version?: string;
    precision?: number;
    latency_ms?: number;
    status?: string;
  }) {
    try {
      const model = await prisma.aIModel.upsert({
        where: { name: data.name },
        update: {
          type: data.type,
          version: data.version || '1.0.0',
          precision: data.precision ?? undefined,
          latency_ms: data.latency_ms ?? undefined,
          status: data.status || 'active',
          updated_at: new Date(),
        },
        create: {
          name: data.name,
          type: data.type,
          version: data.version || '1.0.0',
          precision: data.precision || 0,
          latency_ms: data.latency_ms || 0,
          status: data.status || 'active',
        },
      });

      return model;
    } catch (error: any) {
      logger.error('Error upserting AI model', { error: error.message });
      throw error;
    }
  }

  /**
   * Créer une prédiction
   */
  async createPrediction(data: {
    model_id: string;
    entity_type: string;
    entity_id: string;
    prediction_type: string;
    prediction_value: any;
    confidence: number;
    metadata?: any;
  }) {
    try {
      const prediction = await prisma.aIPrediction.create({
        data: {
          model_id: data.model_id,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          prediction_type: data.prediction_type,
          prediction_value: data.prediction_value,
          confidence: data.confidence,
          metadata: data.metadata,
        },
      });

      return prediction;
    } catch (error: any) {
      logger.error('Error creating prediction', { error: error.message });
      throw error;
    }
  }

  /**
   * Créer une recommandation
   */
  async createRecommendation(data: {
    model_id: string;
    user_id?: string;
    entity_type: string;
    entity_id: string;
    recommendation_type: string;
    score: number;
    reason?: string;
  }) {
    try {
      const recommendation = await prisma.aIRecommendation.create({
        data: {
          model_id: data.model_id,
          user_id: data.user_id,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          recommendation_type: data.recommendation_type,
          score: data.score,
          reason: data.reason,
        },
      });

      return recommendation;
    } catch (error: any) {
      logger.error('Error creating recommendation', { error: error.message });
      throw error;
    }
  }
}

export const aiEngineService = new AIEngineService();
