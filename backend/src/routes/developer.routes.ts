/**
 * Routes API Développeur
 * /api/developer/*
 */

import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { miniAppService } from '../services/miniApp.service.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/database.js';

import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

/**
 * GET /api/developer/subscription
 * Obtenir l'abonnement développeur actuel
 */
router.get('/subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.developerSubscription.findUnique({
      where: { developer_id: userId },
    });

    if (!subscription) {
      // Créer abonnement Starter par défaut
      const result = await miniAppService.subscribeDeveloper(userId, 'starter');
      return res.json({
        success: true,
        data: result.subscription,
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/developer/subscription
 * Souscrire ou changer d'abonnement
 */
router.post('/subscription', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { plan_type, payment_method } = req.body;

    if (!plan_type || !['starter', 'pro', 'enterprise'].includes(plan_type)) {
      return res.status(400).json({
        success: false,
        error: 'Type de plan invalide',
      });
    }

    const result = await miniAppService.subscribeDeveloper(
      userId,
      plan_type as 'starter' | 'pro' | 'enterprise',
      payment_method
    );

    res.json({
      success: true,
      data: result.subscription,
      message: `Abonnement ${plan_type} activé avec succès`,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/developer/revenue
 * Obtenir les revenus du développeur
 */
router.get('/revenue', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { time_range = 'month' } = req.query;

    const result = await miniAppService.getDeveloperRevenue(
      userId,
      time_range as string
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/developer/revenue/withdraw
 * Demander un retrait de revenus
 */
router.post('/revenue/withdraw', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      amount,
      payment_method,
      phone_number,
      bank_account,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide',
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Méthode de paiement requise',
      });
    }

    if (['orange_money', 'mtn_money', 'wave'].includes(payment_method) && !phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone requis pour mobile money',
      });
    }

    const result = await miniAppService.withdrawRevenue(
      userId,
      amount,
      payment_method,
      phone_number,
      bank_account
    );

    res.json({
      success: true,
      data: result.withdrawal,
      message: 'Demande de retrait créée avec succès',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/developer/apps
 * Lister les mini-apps du développeur
 */
router.get('/apps', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const apps = await prisma.miniApp.findMany({
      where: { developer_id: userId },
      include: {
        developer: {
          include: {
            developer_subscription: {
              select: {
                plan_type: true,
                commission_rate: true,
              },
            },
          },
        },
        _count: {
          select: {
            installs: true,
            transactions: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      success: true,
      data: apps,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/developer/analytics
 * Analytics développeur
 */
router.get('/analytics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { time_range = 'month' } = req.query;

    // Calculer date de début
    const now = new Date();
    let startDate = new Date();
    switch (time_range) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const apps = await prisma.miniApp.findMany({
      where: { developer_id: userId },
      select: { id: true },
    });

    const appIds = apps.map(app => app.id);

    const [transactions, installs, revenue] = await Promise.all([
      prisma.miniAppTransaction.findMany({
        where: {
          mini_app_id: { in: appIds },
          created_at: { gte: startDate },
          status: 'completed',
        },
      }),
      prisma.miniAppInstall.count({
        where: {
          mini_app_id: { in: appIds },
          installed_at: { gte: startDate },
        },
      }),
      prisma.developerRevenue.findUnique({
        where: { developer_id: userId },
      }),
    ]);

    const totalGMV = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    const totalCommission = transactions.reduce((sum, txn) => sum + txn.commission_amount, 0);
    const totalEarnings = transactions.reduce((sum, txn) => sum + txn.developer_amount, 0);

    res.json({
      success: true,
      data: {
        gmv: totalGMV,
        commission: totalCommission,
        earnings: totalEarnings,
        transactions_count: transactions.length,
        installs_count: installs,
        revenue: revenue || {
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
