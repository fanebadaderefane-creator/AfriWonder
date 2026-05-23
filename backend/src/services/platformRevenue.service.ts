import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Service pour gérer les revenus de la plateforme
 * La plateforme gagne des commissions sur :
 * - Tips de vidéos (10%)
 * - Gifts en live (30%)
 * - Ventes marketplace (commission configurable)
 * - Abonnements (commission configurable)
 */
class PlatformRevenueService {
  private readonly PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';

  /**
   * Obtenir ou créer le wallet de la plateforme
   */
  async getPlatformWallet() {
    const ledgerService = (await import('./ledger.service.js')).default;
    return await ledgerService.getOrCreateUserWallet(this.PLATFORM_USER_ID, 'XOF');
  }

  /**
   * Ajouter des revenus au wallet de la plateforme
   */
  async addRevenue(amount: number, source: string, description: string, referenceId?: string) {
    const wallet = await this.getPlatformWallet();
    const ledgerService = (await import('./ledger.service.js')).default;
    const updated = await ledgerService.credit(wallet.id, amount, {
      referenceId: referenceId ?? undefined,
      referenceType: 'fee',
      description,
    });

    // Créer une transaction
    await prisma.transaction.create({
      data: {
        user_id: this.PLATFORM_USER_ID,
        type: 'platform_commission',
        amount,
        currency: 'XOF',
        status: 'completed',
        description: `${source}: ${description}`,
        reference_id: referenceId,
        payment_method: 'internal',
      },
    });

    logger.info('Revenu plateforme ajouté', {
      amount,
      source,
      description,
      newBalance: updated.balance,
    });

    return updated;
  }

  /**
   * Obtenir les statistiques de revenus de la plateforme
   */
  async getRevenueStats(startDate?: Date, endDate?: Date) {
    const where: any = {
      user_id: this.PLATFORM_USER_ID,
      type: 'platform_commission',
      status: 'completed',
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [totalRevenue, transactions, wallet] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true,
        },
        _count: true,
      }),
      prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.getPlatformWallet(),
    ]);

    // Grouper par source (video_tips, live_gifts, marketplace, etc.)
    const revenueBySource = await prisma.transaction.groupBy({
      by: ['description'],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions: totalRevenue._count || 0,
      currentBalance: wallet.balance,
      recentTransactions: transactions,
      revenueBySource: revenueBySource.map(item => ({
        source: item.description?.split(':')[0] || 'unknown',
        amount: item._sum.amount || 0,
        count: item._count || 0,
      })),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  /**
   * Obtenir le détail des revenus par type
   */
  async getRevenueByType(type: 'video_tips' | 'live_gifts' | 'marketplace' | 'subscriptions' | 'ads' | 'gifts_tips', startDate?: Date, endDate?: Date) {
    const where: any = {
      user_id: this.PLATFORM_USER_ID,
      type: 'platform_commission',
      status: 'completed',
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    // Filtrer par description selon le type
    const typeFilters: Record<string, string> = {
      video_tips: 'Commission sur tip vidéo',
      live_gifts: 'Commission sur gift live',
      marketplace: 'Commission marketplace',
      subscriptions: 'Commission abonnement',
      ads: 'Campagne pub',
      gifts_tips: 'Commission support créateur',
    };

    if (typeFilters[type]) {
      where.description = {
        contains: typeFilters[type],
      };
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true,
        },
        _count: true,
      }),
      prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
    ]);

    return {
      type,
      totalAmount: total._sum.amount || 0,
      totalCount: total._count || 0,
      transactions,
    };
  }
}

export const platformRevenueService = new PlatformRevenueService();
export default platformRevenueService;

