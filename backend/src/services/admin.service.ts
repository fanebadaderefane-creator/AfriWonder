import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

class AdminService {
  async getDashboard() {
    const [
      totalUsers,
      totalVideos,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentUsers,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: 'completed' },
        _sum: { total_amount: true },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          created_at: true,
        },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalVideos,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.total_amount || 0,
      },
      recentUsers,
      recentOrders,
    };
  }

  async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          is_verified: true,
          created_at: true,
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(userId: string, role: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    logger.info('User role updated', { userId, role });
    return user;
  }

  async banUser(userId: string, banData: {
    banType: string;
    reason: string;
    description?: string;
    durationDays?: number;
    issuedBy: string;
  }) {
    const expiryDate = banData.durationDays
      ? new Date(Date.now() + banData.durationDays * 24 * 60 * 60 * 1000)
      : null;

    const ban = await prisma.userBan.create({
      data: {
        user_id: userId,
        ban_type: banData.banType,
        reason: banData.reason,
        description: banData.description,
        duration_days: banData.durationDays,
        expiry_date: expiryDate,
        is_active: true,
        issued_by: banData.issuedBy,
      },
    });

    logger.info('User banned', { userId, banId: ban.id });
    return ban;
  }

  async getSellers(page: number = 1, limit: number = 20, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search && search.trim()) {
      where.OR = [
        { store_name: { contains: search.trim(), mode: 'insensitive' } },
        { user: { username: { contains: search.trim(), mode: 'insensitive' } } },
        { user: { email: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }
    const [sellers, total] = await Promise.all([
      prisma.sellerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              full_name: true,
              profile_image: true,
              created_at: true,
            },
          },
        },
      }),
      prisma.sellerProfile.count({ where }),
    ]);
    return {
      sellers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateSellerStatus(sellerProfileId: string, status: 'active' | 'suspended' | 'blocked') {
    const profile = await prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { status },
      include: { user: { select: { id: true, username: true } } },
    });
    logger.info('Statut vendeur mis à jour', { sellerProfileId, status });
    return profile;
  }

  async updateSellerVerified(sellerProfileId: string, is_verified: boolean) {
    const profile = await prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { is_verified },
      include: { user: { select: { id: true, username: true } } },
    });
    logger.info('Badge vendeur vérifié mis à jour', { sellerProfileId, is_verified });
    return profile;
  }

  async getProducts(page: number = 1, limit: number = 20, status?: string, seller_id?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (seller_id) where.seller_id = seller_id;
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { category: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              seller_profile: { select: { store_name: true, status: true } },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);
    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateProductStatus(productId: string, status: 'active' | 'suspended' | 'draft') {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { status },
      include: { seller: { select: { id: true, username: true } } },
    });
    logger.info('Statut produit mis à jour', { productId, status });
    return product;
  }

  async getDisputes(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.dispute.count({ where }),
    ]);
    return {
      disputes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllOrders(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, username: true, full_name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, seller_id: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportTransactions(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const transactions = await prisma.transaction.findMany({
      where: {
        created_at: { gte: fromDate, lte: toDate },
      },
      orderBy: { created_at: 'asc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });
    return transactions;
  }

  /** Analytics stratégiques : growth, retention, ARPU, conversions (pour 26M users — agrégations uniquement) */
  async getStrategicAnalytics(params: { from?: string; to?: string }) {
    const to = params.to ? new Date(params.to) : new Date();
    const from = params.from ? new Date(params.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast7d,
      newUsersPrev7d,
      newUsersLast24h,
      ordersCompleted,
      ordersTotal,
      revenueLast30d,
      revenuePrev30d,
      txCountLast24h,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { created_at: { gte: weekAgo } } }),
      prisma.user.count({ where: { created_at: { gte: prevWeekStart, lt: weekAgo } } }),
      prisma.user.count({ where: { created_at: { gte: dayAgo } } }),
      prisma.order.count({ where: { status: { in: ['completed', 'delivered'] } } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: 'completed', created_at: { gte: from } },
        _sum: { total_amount: true },
      }),
      prisma.order.aggregate({
        where: { status: 'completed', created_at: { gte: new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000), lt: from } },
        _sum: { total_amount: true },
      }),
      prisma.transaction.count({ where: { created_at: { gte: dayAgo } } }),
    ]);

    const getActiveUserIds = async (since: Date): Promise<string[]> => {
      const [orderUsers, transactionUsers, viewUsers, cartUsers] = await Promise.all([
        prisma.order.groupBy({
          by: ['user_id'],
          where: { created_at: { gte: since } },
        }),
        prisma.transaction.groupBy({
          by: ['user_id'],
          where: { created_at: { gte: since } },
        }),
        prisma.viewHistory.groupBy({
          by: ['user_id'],
          where: { created_at: { gte: since } },
        }),
        prisma.cart.groupBy({
          by: ['user_id'],
          where: { last_updated: { gte: since } },
        }),
      ]);

      return Array.from(
        new Set([
          ...orderUsers.map((u) => u.user_id),
          ...transactionUsers.map((u) => u.user_id),
          ...viewUsers.map((u) => u.user_id),
          ...cartUsers.map((u) => u.user_id),
        ]),
      );
    };

    const thirtyDaysAgo = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [activeUserIds30d, activeUserIds90d] = await Promise.all([
      getActiveUserIds(thirtyDaysAgo),
      getActiveUserIds(ninetyDaysAgo),
    ]);

    const [eligibleRetention30d, retainedRetention30d, eligibleRetention90d, retainedRetention90d] = await Promise.all([
      prisma.user.count({ where: { created_at: { lt: thirtyDaysAgo } } }),
      activeUserIds30d.length > 0
        ? prisma.user.count({
            where: {
              id: { in: activeUserIds30d },
              created_at: { lt: thirtyDaysAgo },
            },
          })
        : Promise.resolve(0),
      prisma.user.count({ where: { created_at: { lt: ninetyDaysAgo } } }),
      activeUserIds90d.length > 0
        ? prisma.user.count({
            where: {
              id: { in: activeUserIds90d },
              created_at: { lt: ninetyDaysAgo },
            },
          })
        : Promise.resolve(0),
    ]);

    const [newUsers30d, activatedUsers30d, newUsers7d, activatedUsers7d] = await Promise.all([
      prisma.user.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      prisma.user.count({
        where: {
          created_at: { gte: thirtyDaysAgo },
          OR: [
            { orders: { some: {} } },
            { transactions: { some: {} } },
            { view_history: { some: {} } },
            { cart: { is: { subtotal: { gt: 0 } } } },
          ],
        },
      }),
      prisma.user.count({ where: { created_at: { gte: weekAgo } } }),
      prisma.user.count({
        where: {
          created_at: { gte: weekAgo },
          OR: [
            { orders: { some: {} } },
            { transactions: { some: {} } },
            { view_history: { some: {} } },
            { cart: { is: { subtotal: { gt: 0 } } } },
          ],
        },
      }),
    ]);

    const [cartsWithItemsLast7d, cartsConvertedLast7d] = await Promise.all([
      prisma.cart.count({
        where: {
          last_updated: { gte: weekAgo },
          subtotal: { gt: 0 },
        },
      }),
      prisma.cart.count({
        where: {
          last_updated: { gte: weekAgo },
          subtotal: { gt: 0 },
          user: {
            orders: {
              some: { created_at: { gte: weekAgo } },
            },
          },
        },
      }),
    ]);

    const [orderPaymentsCompleted30d, orderPaymentsFailed30d, ordersPaid30d, ordersFailed30d] = await Promise.all([
      prisma.orderPayment.count({
        where: {
          created_at: { gte: from },
          status: 'completed',
        },
      }),
      prisma.orderPayment.count({
        where: {
          created_at: { gte: from },
          status: 'failed',
        },
      }),
      prisma.order.count({
        where: {
          created_at: { gte: from },
          payment_status: 'paid',
        },
      }),
      prisma.order.count({
        where: {
          created_at: { gte: from },
          payment_status: 'failed',
        },
      }),
    ]);

    const [
      totalSellers,
      activeProductsTotal,
      listingsCreated30d,
      sellersWithRating,
      buyerUsers30d,
      visitorUsers30d,
      soldListingsRows30d,
      activeSellersRows30d,
      processingDelayRows30d,
      platformRevenueRows30d,
      npsRows30d,
    ] = await Promise.all([
      prisma.sellerProfile.count(),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({ where: { created_at: { gte: from } } }),
      prisma.sellerProfile.aggregate({
        _avg: { rating: true },
        where: { rating: { gt: 0 } },
      }),
      prisma.order.groupBy({
        by: ['user_id'],
        where: {
          created_at: { gte: from },
          status: { notIn: ['cancelled'] },
        },
      }),
      prisma.viewHistory.groupBy({
        by: ['user_id'],
        where: { created_at: { gte: from } },
      }),
      prisma.$queryRaw<{ sold_count: bigint | number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT oi.product_id) AS sold_count
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o.id = oi.order_id
        WHERE o.created_at >= ${from}
          AND o.status IN ('completed', 'delivered')
      `),
      prisma.$queryRaw<{ active_sellers: bigint | number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT seller_id) AS active_sellers
        FROM (
          SELECT p.seller_id
          FROM "Product" p
          WHERE p.created_at >= ${from} OR p.updated_at >= ${from}
          UNION
          SELECT o.seller_id
          FROM "Order" o
          WHERE o.created_at >= ${from} AND o.seller_id IS NOT NULL
        ) s
      `),
      prisma.$queryRaw<{ avg_hours: number | null }[]>(Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (o.shipped_at - o.created_at)) / 3600.0) AS avg_hours
        FROM "Order" o
        WHERE o.created_at >= ${from}
          AND o.shipped_at IS NOT NULL
      `),
      prisma.$queryRaw<{ source: string; amount: number | null }[]>(Prisma.sql`
        SELECT
          split_part(t.description, ':', 1) AS source,
          SUM(t.amount)::float AS amount
        FROM "Transaction" t
        WHERE t.type = 'platform_commission'
          AND t.status = 'completed'
          AND t.created_at >= ${from}
          AND t.description IS NOT NULL
        GROUP BY split_part(t.description, ':', 1)
      `),
      prisma.$queryRaw<{ promoters: bigint | number; detractors: bigint | number; total: bigint | number }[]>(Prisma.sql`
        SELECT
          SUM(CASE WHEN COALESCE(orv.seller_rating, orv.product_rating) = 5 THEN 1 ELSE 0 END) AS promoters,
          SUM(CASE WHEN COALESCE(orv.seller_rating, orv.product_rating) <= 3 THEN 1 ELSE 0 END) AS detractors,
          COUNT(*) AS total
        FROM "OrderReview" orv
        WHERE orv.created_at >= ${from}
          AND orv.is_verified = true
          AND orv.status = 'approved'
      `),
    ]);

    const rev30 = revenueLast30d._sum.total_amount ?? 0;
    const revPrev30 = revenuePrev30d._sum.total_amount ?? 0;
    const growthRate = revPrev30 > 0 ? ((rev30 - revPrev30) / revPrev30) * 100 : 0;
    const userGrowth7d = newUsersPrev7d > 0 ? ((newUsersLast7d - newUsersPrev7d) / newUsersPrev7d) * 100 : 0;
    const conversionMarketplace = totalUsers > 0 ? (ordersTotal / totalUsers) * 100 : 0;
    const arpu = totalUsers > 0 ? rev30 / totalUsers : 0;
    const mau = activeUserIds30d.length;
    const retentionRate30d = eligibleRetention30d > 0 ? (retainedRetention30d / eligibleRetention30d) * 100 : 0;
    const retentionRate90d = eligibleRetention90d > 0 ? (retainedRetention90d / eligibleRetention90d) * 100 : 0;
    const activationRate30d = newUsers30d > 0 ? (activatedUsers30d / newUsers30d) * 100 : 0;
    const activationRate7d = newUsers7d > 0 ? (activatedUsers7d / newUsers7d) * 100 : 0;
    const abandonedCartsLast7d = Math.max(0, cartsWithItemsLast7d - cartsConvertedLast7d);
    const cartAbandonmentRate7d = cartsWithItemsLast7d > 0 ? (abandonedCartsLast7d / cartsWithItemsLast7d) * 100 : 0;
    const paymentAttempts30d = orderPaymentsCompleted30d + orderPaymentsFailed30d;
    const fallbackPaymentAttempts30d = ordersPaid30d + ordersFailed30d;
    const paymentSuccessRate30d = paymentAttempts30d > 0
      ? (orderPaymentsCompleted30d / paymentAttempts30d) * 100
      : (fallbackPaymentAttempts30d > 0 ? (ordersPaid30d / fallbackPaymentAttempts30d) * 100 : 0);
    const paymentsSuccess30d = paymentAttempts30d > 0 ? orderPaymentsCompleted30d : ordersPaid30d;
    const paymentsFailed30d = paymentAttempts30d > 0 ? orderPaymentsFailed30d : ordersFailed30d;
    const paymentsAttempted30d = paymentAttempts30d > 0 ? paymentAttempts30d : fallbackPaymentAttempts30d;
    const activeSellers30d = Number(activeSellersRows30d?.[0]?.active_sellers ?? 0);
    const avgProductsPerSeller = totalSellers > 0 ? activeProductsTotal / totalSellers : 0;
    const soldListings30d = Number(soldListingsRows30d?.[0]?.sold_count ?? 0);
    const listingToSaleConversionRate30d = listingsCreated30d > 0 ? (soldListings30d / listingsCreated30d) * 100 : 0;
    const avgSellerRating = sellersWithRating?._avg?.rating ?? 0;
    const avgOrderProcessingHours30d = processingDelayRows30d?.[0]?.avg_hours ?? 0;
    const gmv30d = rev30;
    const avgBasket30d = ordersCompleted > 0 ? gmv30d / ordersCompleted : 0;
    const buyers30d = buyerUsers30d.length;
    const visitors30d = visitorUsers30d.length;
    const visitorToBuyerConversionRate30d = visitors30d > 0 ? (buyers30d / visitors30d) * 100 : 0;
    const revenueBySource = new Map((platformRevenueRows30d || []).map((r) => [String(r.source || '').trim(), Number(r.amount || 0)]));
    const commissionRevenue30d = revenueBySource.get('marketplace') ?? 0;
    const subscriptionRevenue30d = revenueBySource.get('subscriptions') ?? 0;
    const adsRevenue30d = revenueBySource.get('ads') ?? 0;
    const giftsTipsRevenue30d = (revenueBySource.get('gifts_tips') ?? 0) + (revenueBySource.get('video_tips') ?? 0) + (revenueBySource.get('live_gifts') ?? 0);
    const totalPlatformRevenue30d = commissionRevenue30d + subscriptionRevenue30d + adsRevenue30d + giftsTipsRevenue30d;
    const npsPromoters30d = Number(npsRows30d?.[0]?.promoters ?? 0);
    const npsDetractors30d = Number(npsRows30d?.[0]?.detractors ?? 0);
    const npsRespondents30d = Number(npsRows30d?.[0]?.total ?? 0);
    const nps30d = npsRespondents30d > 0 ? ((npsPromoters30d - npsDetractors30d) / npsRespondents30d) * 100 : 0;

    return {
      growthRate: Math.round(growthRate * 100) / 100,
      newUsersLast7d,
      newUsersLast24h,
      userGrowthRate7d: Math.round(userGrowth7d * 100) / 100,
      retentionNote: 'Retention calculee sur utilisateurs actifs via commandes, transactions, vues et paniers',
      arpu: Math.round(arpu * 100) / 100,
      ltvNote: 'LTV/CAC a calculer via cohortes',
      conversionMarketplace: Math.round(conversionMarketplace * 100) / 100,
      revenueLast30d: rev30,
      transactionsLast24h: txCountLast24h,
      ordersCompleted,
      ordersTotal,
      mau,
      retentionRate30d: Math.round(retentionRate30d * 100) / 100,
      retentionRate90d: Math.round(retentionRate90d * 100) / 100,
      newUsers30d,
      activatedUsers30d,
      activationRate30d: Math.round(activationRate30d * 100) / 100,
      newUsers7d,
      activatedUsers7d,
      activationRate7d: Math.round(activationRate7d * 100) / 100,
      cartsWithItemsLast7d,
      cartsConvertedLast7d,
      abandonedCartsLast7d,
      cartAbandonmentRate7d: Math.round(cartAbandonmentRate7d * 100) / 100,
      paymentsAttempted30d,
      paymentsSuccess30d,
      paymentsFailed30d,
      paymentSuccessRate30d: Math.round(paymentSuccessRate30d * 100) / 100,
      sellersTotal: totalSellers,
      activeSellers30d,
      avgProductsPerSeller: Math.round(avgProductsPerSeller * 100) / 100,
      listingsCreated30d,
      soldListings30d,
      listingToSaleConversionRate30d: Math.round(listingToSaleConversionRate30d * 100) / 100,
      avgOrderProcessingHours30d: Math.round(Number(avgOrderProcessingHours30d) * 100) / 100,
      avgSellerRating: Math.round(Number(avgSellerRating) * 100) / 100,
      gmv30d,
      avgBasket30d: Math.round(avgBasket30d * 100) / 100,
      buyers30d,
      visitors30d,
      visitorToBuyerConversionRate30d: Math.round(visitorToBuyerConversionRate30d * 100) / 100,
      commissionRevenue30d: Math.round(commissionRevenue30d * 100) / 100,
      subscriptionRevenue30d: Math.round(subscriptionRevenue30d * 100) / 100,
      adsRevenue30d: Math.round(adsRevenue30d * 100) / 100,
      giftsTipsRevenue30d: Math.round(giftsTipsRevenue30d * 100) / 100,
      totalPlatformRevenue30d: Math.round(totalPlatformRevenue30d * 100) / 100,
      nps30d: Math.round(nps30d * 100) / 100,
      npsRespondents30d,
      npsNote: 'NPS proxy derive des avis verifies: 5=promoteur, 4=passif, 1-3=detracteur',
    };
  }
}

export default new AdminService();


