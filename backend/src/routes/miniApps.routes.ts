/**
 * Routes API Mini-Apps
 * /api/mini-apps/*
 */

import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { miniAppService } from '../services/miniApp.service.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/mini-apps
 * Lister les mini-apps (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      category = 'all',
      status,
      featured,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await miniAppService.listMiniApps({
      category: category as string,
      status: status as string,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/mini-apps/:id
 * Détails d'une mini-app (public)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const app = await prisma.miniApp.findUnique({
      where: { id },
      include: {
        developer: {
          select: {
            id: true,
            full_name: true,
            profile_image: true,
            is_verified: true,
          },
        },
        subscription: {
          select: {
            plan_type: true,
            commission_rate: true,
          },
        },
        _count: {
          select: {
            installs: true,
            transactions: true,
          },
        },
      },
    });

    if (!app || app.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'Mini-app introuvable',
      });
    }

    res.json({
      success: true,
      data: app,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/mini-apps
 * Créer une mini-app (développeur)
 */
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      icon_url,
      category,
      permissions,
      screenshots,
      bundle_url,
      bundle_hash,
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Nom, description et catégorie requis',
      });
    }

    const result = await miniAppService.createMiniApp(userId, {
      name,
      description,
      icon_url,
      category,
      permissions: permissions || [],
      screenshots,
      bundle_url,
      bundle_hash,
    });

    res.json({
      success: true,
      data: result.miniApp,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/mini-apps/:id/install
 * Installer une mini-app (utilisateur)
 */
router.post('/:id/install', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await miniAppService.installMiniApp(id, userId);

    res.json({
      success: true,
      data: result.install,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/mini-apps/:id/transaction
 * Créer une transaction dans une mini-app (utilisateur)
 * Cette route initie le paiement Orange Money
 */
router.post('/:id/transaction', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      amount,
      payment_method = 'orange_money',
      description,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide',
      });
    }

    // Ici, normalement on initierait le paiement Orange Money
    // Pour l'instant, on simule directement le traitement
    // En production, on créerait d'abord la transaction en pending
    // puis on confirmerait via webhook Orange Money

    const result = await miniAppService.processTransaction(
      id,
      userId,
      amount,
      payment_method,
      undefined, // paymentReference sera fourni par webhook
      description
    );

    res.json({
      success: true,
      data: result.transaction,
      message: 'Transaction traitée avec succès',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/mini-apps/:id/boost
 * Acheter un boost pour une mini-app (développeur)
 */
router.post('/:id/boost', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      boost_type,
      price,
      duration_days,
      payment_reference,
    } = req.body;

    // Vérifier que l'utilisateur est le développeur
    const app = await prisma.miniApp.findUnique({
      where: { id },
      select: { developer_id: true },
    });

    if (!app || app.developer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
      });
    }

    const result = await miniAppService.purchaseBoost(
      id,
      boost_type,
      price,
      duration_days,
      payment_reference
    );

    res.json({
      success: true,
      data: result.boost,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
