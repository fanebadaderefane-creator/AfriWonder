/**
 * Mini-App Service
 * Gestion des mini-apps, transactions, commissions et revenus
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

// Taux de commission par catégorie
const COMMISSION_RATES: Record<string, number> = {
  commerce: 0.10,
  marketplace: 0.12,
  services: 0.10,
  transport: 0.15,
  education: 0.05,
  sante: 0.08,
  finance: 0.05,
  social: 0.05,
  agriculture: 0.08,
  travel: 0.12,
  default: 0.10,
};

// Taux de commission par plan développeur
const PLAN_COMMISSION_RATES: Record<string, number> = {
  starter: 0.10,
  pro: 0.08,
  enterprise: 0.05,
};

export class MiniAppService {
  /**
   * Créer ou mettre à jour l'abonnement développeur
   */
  async subscribeDeveloper(
    developerId: string,
    planType: 'starter' | 'pro' | 'enterprise',
    paymentMethod?: string
  ) {
    try {
      const commissionRate = PLAN_COMMISSION_RATES[planType] || 0.10;
      
      // Calculer la date d'expiration
      let expiresAt: Date | null = null;
      if (planType === 'pro') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (planType === 'enterprise') {
        expiresAt = null; // Permanent
      }

      const subscription = await prisma.developerSubscription.upsert({
        where: { developer_id: developerId },
        update: {
          plan_type: planType,
          commission_rate: commissionRate,
          status: 'active',
          started_at: new Date(),
          expires_at: expiresAt,
          payment_method: paymentMethod,
          last_payment_at: new Date(),
          next_payment_at: planType === 'pro' ? expiresAt : null,
          cancelled_at: null,
        },
        create: {
          developer_id: developerId,
          plan_type: planType,
          commission_rate: commissionRate,
          status: 'active',
          started_at: new Date(),
          expires_at: expiresAt,
          payment_method: paymentMethod,
          last_payment_at: new Date(),
          next_payment_at: planType === 'pro' ? expiresAt : null,
        },
      });

      // Créer le wallet revenus si n'existe pas
      await prisma.developerRevenue.upsert({
        where: { developer_id: developerId },
        update: {},
        create: {
          developer_id: developerId,
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        },
      });

      logger.info('Developer subscription created/updated', { developerId, planType });
      return { success: true, subscription };
    } catch (error: any) {
      logger.error('Error subscribing developer', { error: error.message, developerId });
      throw error;
    }
  }

  /**
   * Créer une mini-app
   */
  async createMiniApp(developerId: string, data: {
    name: string;
    description: string;
    icon_url?: string;
    category: string;
    permissions: string[];
    screenshots?: string[];
    bundle_url?: string;
    bundle_hash?: string;
  }) {
    try {
      // Vérifier l'abonnement développeur
      const subscription = await prisma.developerSubscription.findUnique({
        where: { developer_id: developerId },
      });

      if (!subscription) {
        // Créer abonnement Starter par défaut
        await this.subscribeDeveloper(developerId, 'starter');
      }

      // Vérifier limite d'apps pour Starter
      if (subscription?.plan_type === 'starter') {
        const appCount = await prisma.miniApp.count({
          where: { developer_id: developerId, status: { not: 'draft' } },
        });
        if (appCount >= 1) {
          throw new Error('Limite de 1 mini-app atteinte avec le plan Starter. Passez au Plan Pro pour des apps illimitées.');
        }
      }

      // Calculer taux commission selon catégorie
      const categoryRate = COMMISSION_RATES[data.category] || COMMISSION_RATES.default;
      const planRate = subscription?.commission_rate || 0.10;
      // Utiliser le taux le plus bas (plan prioritaire)
      const finalRate = Math.min(categoryRate, planRate);

      const miniApp = await prisma.miniApp.create({
        data: {
          developer_id: developerId,
          name: data.name,
          description: data.description,
          icon_url: data.icon_url,
          category: data.category,
          permissions: data.permissions,
          screenshots: data.screenshots || [],
          bundle_url: data.bundle_url,
          bundle_hash: data.bundle_hash,
          commission_rate: finalRate,
          status: 'pending', // Nécessite validation admin
        },
      });

      logger.info('Mini-app created', { miniAppId: miniApp.id, developerId });
      return { success: true, miniApp };
    } catch (error: any) {
      logger.error('Error creating mini-app', { error: error.message, developerId });
      throw error;
    }
  }

  /**
   * REVENUE ENGINE - Traiter une transaction et split automatique
   */
  async processTransaction(
    miniAppId: string,
    userId: string,
    amount: number,
    paymentMethod: string = 'orange_money',
    paymentReference?: string,
    description?: string
  ) {
    try {
      // Récupérer la mini-app et son abonnement
      const miniApp = await prisma.miniApp.findUnique({
        where: { id: miniAppId },
        include: { subscription: true },
      });

      if (!miniApp) {
        throw new Error('Mini-app introuvable');
      }

      if (miniApp.status !== 'published') {
        throw new Error('Mini-app non publiée');
      }

      // Calculer commission
      const commissionRate = miniApp.commission_rate;
      const commissionAmount = amount * commissionRate;
      const developerAmount = amount - commissionAmount;

      // Créer la transaction
      const transaction = await prisma.miniAppTransaction.create({
        data: {
          mini_app_id: miniAppId,
          user_id: userId,
          amount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          developer_amount: developerAmount,
          status: 'pending',
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          description: description || `Transaction ${miniApp.name}`,
        },
      });

      // Ici, normalement on attendrait la confirmation du paiement Orange Money
      // Pour l'instant, on simule le traitement immédiat
      // En production, cela se ferait via webhook Orange Money

      // Mettre à jour les stats de la mini-app
      await prisma.miniApp.update({
        where: { id: miniAppId },
        data: {
          gmv_total: { increment: amount },
          revenue_total: { increment: developerAmount },
          commission_total: { increment: commissionAmount },
          last_transaction_at: new Date(),
        },
      });

      // Créditer le wallet développeur (créer s'il n'existe pas)
      await prisma.developerRevenue.upsert({
        where: { developer_id: miniApp.developer_id },
        update: {
          balance: { increment: developerAmount },
          pending_balance: { increment: developerAmount },
          total_earned: { increment: developerAmount },
        },
        create: {
          developer_id: miniApp.developer_id,
          balance: developerAmount,
          pending_balance: developerAmount,
          total_earned: developerAmount,
          total_withdrawn: 0,
        },
      });

      // Marquer transaction comme complétée
      await prisma.miniAppTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          processed_at: new Date(),
        },
      });

      logger.info('Transaction processed and split', {
        transactionId: transaction.id,
        amount,
        commissionAmount,
        developerAmount,
      });

      return {
        success: true,
        transaction: {
          ...transaction,
          status: 'completed',
          processed_at: new Date(),
        },
      };
    } catch (error: any) {
      logger.error('Error processing transaction', { error: error.message, miniAppId });
      throw error;
    }
  }

  /**
   * Confirmer transaction après webhook Orange Money
   */
  async confirmTransaction(transactionId: string, paymentReference: string) {
    try {
      const transaction = await prisma.miniAppTransaction.findUnique({
        where: { id: transactionId },
        include: { mini_app: true },
      });

      if (!transaction) {
        throw new Error('Transaction introuvable');
      }

      if (transaction.status === 'completed') {
        return { success: true, message: 'Transaction déjà complétée' };
      }

      // Mettre à jour avec référence paiement
      await prisma.miniAppTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'completed',
          payment_reference: paymentReference,
          processed_at: new Date(),
        },
      });

      // Les stats et crédit wallet sont déjà faits dans processTransaction
      // Mais on peut les refaire ici pour sécurité

      logger.info('Transaction confirmed', { transactionId, paymentReference });
      return { success: true };
    } catch (error: any) {
      logger.error('Error confirming transaction', { error: error.message });
      throw error;
    }
  }

  /**
   * Acheter un boost
   */
  async purchaseBoost(
    miniAppId: string,
    boostType: string,
    price: number,
    durationDays?: number,
    paymentReference?: string
  ) {
    try {
      const miniApp = await prisma.miniApp.findUnique({
        where: { id: miniAppId },
      });

      if (!miniApp) {
        throw new Error('Mini-app introuvable');
      }

      const expiresAt = new Date();
      if (durationDays) {
        expiresAt.setDate(expiresAt.getDate() + durationDays);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 7); // Par défaut 7 jours
      }

      const boost = await prisma.miniAppBoost.create({
        data: {
          mini_app_id: miniAppId,
          boost_type: boostType,
          price,
          duration_days: durationDays,
          expires_at: expiresAt,
          status: 'active',
          payment_reference: paymentReference,
        },
      });

      // Mettre à jour featured si boost featured
      if (boostType === 'featured') {
        await prisma.miniApp.update({
          where: { id: miniAppId },
          data: { featured: true },
        });
      }

      logger.info('Boost purchased', { boostId: boost.id, miniAppId, boostType });
      return { success: true, boost };
    } catch (error: any) {
      logger.error('Error purchasing boost', { error: error.message });
      throw error;
    }
  }

  /**
   * Installer une mini-app
   */
  async installMiniApp(miniAppId: string, userId: string) {
    try {
      const install = await prisma.miniAppInstall.upsert({
        where: {
          mini_app_id_user_id: {
            mini_app_id: miniAppId,
            user_id: userId,
          },
        },
        update: {
          installed_at: new Date(),
          last_used_at: new Date(),
          uninstalled_at: null,
        },
        create: {
          mini_app_id: miniAppId,
          user_id: userId,
          installed_at: new Date(),
          last_used_at: new Date(),
        },
      });

      // Incrémenter compteur installations
      await prisma.miniApp.update({
        where: { id: miniAppId },
        data: {
          installs_count: { increment: 1 },
        },
      });

      return { success: true, install };
    } catch (error: any) {
      logger.error('Error installing mini-app', { error: error.message });
      throw error;
    }
  }

  /**
   * Retirer des revenus développeur
   */
  async withdrawRevenue(
    developerId: string,
    amount: number,
    paymentMethod: string,
    phoneNumber?: string,
    bankAccount?: string
  ) {
    try {
      const revenue = await prisma.developerRevenue.findUnique({
        where: { developer_id: developerId },
      });

      if (!revenue) {
        throw new Error('Wallet développeur introuvable');
      }

      const fee = 500; // Frais retrait
      const netAmount = amount - fee;
      const minimumWithdrawal = 5000;

      if (amount < minimumWithdrawal) {
        throw new Error(`Montant minimum de retrait: ${minimumWithdrawal} XOF`);
      }

      if (revenue.balance < amount) {
        throw new Error('Solde insuffisant');
      }

      // Créer demande de retrait
      const withdrawal = await prisma.developerWithdrawal.create({
        data: {
          developer_id: developerId,
          amount,
          fee,
          net_amount: netAmount,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          bank_account: bankAccount,
          status: 'pending',
        },
      });

      // Débiter le wallet (en attente de traitement)
      await prisma.developerRevenue.update({
        where: { developer_id: developerId },
        data: {
          balance: { decrement: amount },
          pending_balance: { decrement: amount },
        },
      });

      logger.info('Withdrawal requested', { withdrawalId: withdrawal.id, developerId, amount });
      return { success: true, withdrawal };
    } catch (error: any) {
      logger.error('Error withdrawing revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les revenus d'un développeur
   */
  async getDeveloperRevenue(developerId: string, timeRange: string = 'month') {
    try {
      const revenue = await prisma.developerRevenue.findUnique({
        where: { developer_id: developerId },
      });

      if (!revenue) {
        return {
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          transactions: [],
        };
      }

      // Calculer date de début selon timeRange
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
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
          startDate = new Date(0); // Toutes les transactions
      }

      // Récupérer transactions
      const miniApps = await prisma.miniApp.findMany({
        where: { developer_id: developerId },
        select: { id: true },
      });

      const appIds = miniApps.map(app => app.id);

      const transactions = await prisma.miniAppTransaction.findMany({
        where: {
          mini_app_id: { in: appIds },
          created_at: { gte: startDate },
          status: 'completed',
        },
        include: {
          mini_app: {
            select: {
              id: true,
              name: true,
              icon_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      return {
        ...revenue,
        transactions,
      };
    } catch (error: any) {
      logger.error('Error getting developer revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Lister les mini-apps avec filtres
   */
  async listMiniApps(filters: {
    category?: string;
    status?: string;
    featured?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.category && filters.category !== 'all') {
        where.category = filters.category;
      }

      if (filters.status) {
        where.status = filters.status;
      } else {
        where.status = 'published'; // Par défaut seulement publiées
      }

      if (filters.featured !== undefined) {
        where.featured = filters.featured;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [apps, total] = await Promise.all([
        prisma.miniApp.findMany({
          where,
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
              },
            },
            _count: {
              select: {
                installs: true,
              },
            },
          },
          orderBy: [
            { featured: 'desc' },
            { installs_count: 'desc' },
          ],
          skip,
          take: limit,
        }),
        prisma.miniApp.count({ where }),
      ]);

      return {
        apps,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Error listing mini-apps', { error: error.message });
      throw error;
    }
  }
}

export const miniAppService = new MiniAppService();
