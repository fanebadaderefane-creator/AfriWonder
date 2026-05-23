/**
 * Business Intelligence Service
 * Analytics & Data Insights - KPIs, métriques, revenus, croissance
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export class BusinessIntelligenceService {
  /**
   * Obtenir les KPIs principaux pour une période
   */
  async getKPIs(periodType: 'day' | 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let periodStart = new Date();
      let previousPeriodStart = new Date();

      switch (periodType) {
        case 'day':
          periodStart.setHours(0, 0, 0, 0);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          periodStart.setDate(now.getDate() - dayOfWeek);
          periodStart.setHours(0, 0, 0, 0);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }

      // Utilisateurs actifs
      const activeUsers = await prisma.user.count({
        where: {
          updated_at: { gte: periodStart },
        },
      });

      const previousActiveUsers = await prisma.user.count({
        where: {
          updated_at: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
        },
      });

      // Transactions du jour (pour "Transactions Jour")
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const dailyTransactions = await prisma.transaction.count({
        where: {
          created_at: { gte: todayStart },
          status: 'completed',
        },
      });

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const previousDailyTransactions = await prisma.transaction.count({
        where: {
          created_at: {
            gte: yesterdayStart,
            lt: todayStart,
          },
          status: 'completed',
        },
      });

      // Volume transactions (montant total)
      const transactions = await prisma.transaction.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
        },
        select: { amount: true },
      });

      const volumeTransactions = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      const previousTransactions = await prisma.transaction.findMany({
        where: {
          created_at: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
          status: 'completed',
        },
        select: { amount: true },
      });

      const previousVolumeTransactions = previousTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

      // Revenus commission (transactions mini-apps + marketplace commissions)
      const miniAppTransactions = await prisma.miniAppTransaction.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
        },
        select: { commission_amount: true },
      });

      const marketplaceCommissions = await prisma.transaction.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
          type: 'marketplace',
        },
        select: { amount: true },
      });

      // Estimation commission marketplace (10% par défaut)
      const commissionRevenue =
        miniAppTransactions.reduce((sum, t) => sum + t.commission_amount, 0) +
        marketplaceCommissions.reduce((sum, t) => sum + (t.amount || 0) * 0.1, 0);

      const previousMiniAppTransactions = await prisma.miniAppTransaction.findMany({
        where: {
          created_at: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
          status: 'completed',
        },
        select: { commission_amount: true },
      });

      const previousMarketplaceCommissions = await prisma.transaction.findMany({
        where: {
          created_at: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
          status: 'completed',
          type: 'marketplace',
        },
        select: { amount: true },
      });

      const previousCommissionRevenue =
        previousMiniAppTransactions.reduce((sum, t) => sum + t.commission_amount, 0) +
        previousMarketplaceCommissions.reduce((sum, t) => sum + (t.amount || 0) * 0.1, 0);

      // Calculer % croissance
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        activeUsers: {
          value: activeUsers,
          growth: calculateGrowth(activeUsers, previousActiveUsers),
        },
        dailyTransactions: {
          value: dailyTransactions,
          growth: calculateGrowth(dailyTransactions, previousDailyTransactions),
        },
        transactionVolume: {
          value: volumeTransactions,
          growth: calculateGrowth(volumeTransactions, previousVolumeTransactions),
        },
        commissionRevenue: {
          value: commissionRevenue,
          growth: calculateGrowth(commissionRevenue, previousCommissionRevenue),
        },
      };
    } catch (error: any) {
      logger.error('Error getting KPIs', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir la croissance utilisateurs sur plusieurs mois
   */
  async getUserGrowth(months: number = 12) {
    try {
      const now = new Date();
      const data: Array<{ month: string; users: number }> = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const users = await prisma.user.count({
          where: {
            created_at: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        });

        const monthNames = [
          'Jan',
          'Fev',
          'Mar',
          'Avr',
          'Mai',
          'Jun',
          'Jul',
          'Aou',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];

        data.push({
          month: monthNames[monthStart.getMonth()],
          users,
        });
      }

      return data;
    } catch (error: any) {
      logger.error('Error getting user growth', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les revenus par service
   */
  async getRevenueByService(periodType: 'day' | 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let periodStart = new Date();

      switch (periodType) {
        case 'day':
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          periodStart.setDate(now.getDate() - dayOfWeek);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Marketplace
      const marketplaceTransactions = await prisma.transaction.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
          type: 'marketplace',
        },
        select: { amount: true },
      });
      const marketplaceRevenue = marketplaceTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

      // Live (tips + subscriptions)
      const liveTips = await prisma.videoTip.findMany({
        where: {
          created_at: { gte: periodStart },
        },
        select: { amount: true },
      });
      const liveSubscriptions = await prisma.liveCreatorSubscription.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'active',
        },
        select: { amount_fcfa: true },
      });
      const liveRevenue =
        liveTips.reduce((sum: number, t) => sum + t.amount, 0) +
        liveSubscriptions.reduce((sum: number, s) => sum + (s.amount_fcfa || 0), 0);

      // Transport (rides)
      const rides = await prisma.ride.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
        },
        select: { price: true },
      });
      const transportRevenue = rides.reduce((sum: number, r) => sum + (r.price || 0), 0);

      // Services
      const serviceBookings = await prisma.serviceBooking.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
        },
        select: { total_price: true },
      });
      const servicesRevenue = serviceBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      // Mini-Apps (GMV)
      const miniAppTransactions = await prisma.miniAppTransaction.findMany({
        where: {
          created_at: { gte: periodStart },
          status: 'completed',
        },
        select: { amount: true },
      });
      const miniAppsRevenue = miniAppTransactions.reduce((sum, t) => sum + t.amount, 0);

      return [
        {
          service: 'Marketplace',
          revenue: marketplaceRevenue,
        },
        {
          service: 'Live',
          revenue: liveRevenue,
        },
        {
          service: 'Transport',
          revenue: transportRevenue,
        },
        {
          service: 'Services',
          revenue: servicesRevenue,
        },
        {
          service: 'Mini-Apps',
          revenue: miniAppsRevenue,
        },
      ].sort((a, b) => b.revenue - a.revenue);
    } catch (error: any) {
      logger.error('Error getting revenue by service', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les insights automatiques
   */
  async getInsights(_limit: number = 10) {
    try {
      // Modèle BIInsight non présent dans le schéma actuel
      return [];
    } catch (error: unknown) {
      logger.error('Error getting insights', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Générer un insight automatique
   */
  async generateInsight(data: {
    insight_type: string;
    title: string;
    description: string;
    severity?: string;
    metric_value?: number;
    metric_change?: number;
    period_start?: Date;
    period_end?: Date;
  }) {
    try {
      // Modèle BIInsight non présent dans le schéma actuel
      return { id: 'stub', ...data, severity: data.severity ?? 'info', created_at: new Date() };
    } catch (error: unknown) {
      logger.error('Error generating insight', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Obtenir analytics géographiques
   */
  async getGeographyAnalytics(periodType: 'day' | 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let periodStart = new Date();

      switch (periodType) {
        case 'day':
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          periodStart.setDate(now.getDate() - dayOfWeek);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Grouper par pays
      const users = await prisma.user.findMany({
        where: {
          updated_at: { gte: periodStart },
        },
        select: {
          country: true,
        },
      });

      const countryStats: Record<
        string,
        { activeUsers: number; transactions: number; revenue: number }
      > = {};

      users.forEach((user) => {
        const country = user.country || 'Unknown';
        if (!countryStats[country]) {
          countryStats[country] = { activeUsers: 0, transactions: 0, revenue: 0 };
        }
        countryStats[country].activeUsers++;
      });

      // Transactions par pays (via user.country; shipping_address est un string, pas une relation)
      const orders = await prisma.order.findMany({
        where: {
          created_at: { gte: periodStart },
          status: { in: ['completed', 'delivered'] },
        },
        include: {
          user: {
            select: { country: true },
          },
        },
      });

      orders.forEach((order) => {
        const country = order.user?.country ?? 'Unknown';
        if (!countryStats[country]) {
          countryStats[country] = { activeUsers: 0, transactions: 0, revenue: 0 };
        }
        countryStats[country].transactions++;
        countryStats[country].revenue += order.total_amount || 0;
      });

      return Object.entries(countryStats).map(([country, stats]) => ({
        country,
        ...stats,
      }));
    } catch (error: any) {
      logger.error('Error getting geography analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir analytics de rétention
   */
  async getRetentionAnalytics(months: number = 6) {
    try {
      const now = new Date();
      const data: Array<{ cohort: string; retention: number }> = [];

      for (let i = months - 1; i >= 0; i--) {
        const cohortMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        // Utilisateurs inscrits ce mois
        const cohortUsers = await prisma.user.findMany({
          where: {
            created_at: {
              gte: cohortMonth,
              lte: cohortEnd,
            },
          },
          select: { id: true },
        });

        // Utilisateurs actifs ce mois (qui se sont connectés)
        const activeThisMonth = await prisma.user.count({
          where: {
            id: { in: cohortUsers.map((u) => u.id) },
            updated_at: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        });

        const retentionRate =
          cohortUsers.length > 0 ? activeThisMonth / cohortUsers.length : 0;

        const monthNames = [
          'Jan',
          'Fev',
          'Mar',
          'Avr',
          'Mai',
          'Jun',
          'Jul',
          'Aou',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];

        data.push({
          cohort: monthNames[cohortMonth.getMonth()],
          retention: Math.round(retentionRate * 100) / 100,
        });
      }

      return data;
    } catch (error: any) {
      logger.error('Error getting retention analytics', { error: error.message });
      throw error;
    }
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();
