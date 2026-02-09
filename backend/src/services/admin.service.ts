import prisma from '../config/database.js';
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

    const rev30 = revenueLast30d._sum.total_amount ?? 0;
    const revPrev30 = revenuePrev30d._sum.total_amount ?? 0;
    const growthRate = revPrev30 > 0 ? ((rev30 - revPrev30) / revPrev30) * 100 : 0;
    const userGrowth7d = newUsersPrev7d > 0 ? ((newUsersLast7d - newUsersPrev7d) / newUsersPrev7d) * 100 : 0;
    const conversionMarketplace = totalUsers > 0 ? (ordersTotal / totalUsers) * 100 : 0;
    const arpu = totalUsers > 0 ? rev30 / totalUsers : 0;

    return {
      growthRate: Math.round(growthRate * 100) / 100,
      newUsersLast7d,
      newUsersLast24h,
      userGrowthRate7d: Math.round(userGrowth7d * 100) / 100,
      retentionNote: 'Calcul détaillé 7j/30j via cohortes à brancher sur pipeline analytics',
      arpu: Math.round(arpu * 100) / 100,
      ltvNote: 'LTV/CAC à calculer via cohortes',
      conversionMarketplace: Math.round(conversionMarketplace * 100) / 100,
      revenueLast30d: rev30,
      transactionsLast24h: txCountLast24h,
      ordersCompleted,
      ordersTotal,
    };
  }
}

export default new AdminService();

