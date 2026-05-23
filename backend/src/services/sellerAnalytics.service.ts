import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'custom';

function getDateRange(period: PeriodKey, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === '7d') {
    start.setDate(start.getDate() - 7);
  } else if (period === '30d') {
    start.setDate(start.getDate() - 30);
  } else if (period === '90d') {
    start.setDate(start.getDate() - 90);
  } else if (period === '12m') {
    start.setMonth(start.getMonth() - 12);
  } else if (period === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  } else {
    start.setDate(start.getDate() - 30);
  }
  return { start, end };
}

class SellerAnalyticsService {
  /** KPIs + comparaison période précédente */
  async getDashboard(sellerId: string, period: PeriodKey = '30d', customStart?: Date, customEnd?: Date) {
    const { start, end } = getDateRange(period, customStart, customEnd);
    const prevRange = this.getPreviousRange(start, end);

    const [orderItemsCurrent, orderItemsPrev, products, abandonedCartsRaw, orderItemsWithProduct] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            created_at: { gte: start, lte: end },
            status: { notIn: ['cancelled'] },
          },
        },
        include: { order: true, product: true },
      }),
      prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            created_at: { gte: prevRange.start, lt: prevRange.end },
            status: { notIn: ['cancelled'] },
          },
        },
        include: { order: true },
      }),
      prisma.product.findMany({
        where: { seller_id: sellerId, status: 'active' },
        select: { id: true, name: true, price: true, stock: true },
      }),
      prisma.abandonedCart
        .findMany({
          where: { seller_id: sellerId, abandoned_at: { gte: start, lte: end } },
        })
        .catch((err) => {
          logger.warn('AbandonedCart query failed (table or schema mismatch)', { sellerId, err: err.message });
          return [];
        }),
      prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            created_at: { gte: start, lte: end },
            status: { notIn: ['cancelled'] },
          },
        },
        include: { product: true, order: true },
      }),
    ]);
    const abandonedCarts = abandonedCartsRaw;

    const orderIdsCurrent = [...new Set(orderItemsCurrent.map(i => i.order_id))];
    const ordersCurrent = orderItemsCurrent.length
      ? await prisma.order.findMany({
          where: { id: { in: orderIdsCurrent } },
          orderBy: { created_at: 'desc' },
          take: 10,
          include: { user: { select: { full_name: true } } },
        })
      : [];
    const revenueCurrent = orderItemsCurrent.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const revenuePrev = orderItemsPrev.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const completedCurrent = ordersCurrent.filter(o => ['delivered', 'completed'].includes(o.status)).length;
    const orderIdsPrev = [...new Set(orderItemsPrev.map(i => i.order_id))];
    const ordersPrev = orderItemsPrev.length ? await prisma.order.findMany({ where: { id: { in: orderIdsPrev } } }) : [];
    const completedPrev = ordersPrev.filter(o => ['delivered', 'completed'].includes(o.status)).length;

    const revenueGrowth = revenuePrev > 0 ? ((revenueCurrent - revenuePrev) / revenuePrev) * 100 : (revenueCurrent > 0 ? 100 : 0);
    const ordersGrowth = orderIdsPrev.length > 0 ? ((orderIdsCurrent.length - orderIdsPrev.length) / orderIdsPrev.length) * 100 : (orderIdsCurrent.length > 0 ? 100 : 0);
    const conversionGrowth = completedPrev > 0 && ordersPrev.length > 0
      ? (((completedCurrent / Math.max(1, ordersCurrent.length)) - (completedPrev / ordersPrev.length)) / (completedPrev / ordersPrev.length)) * 100
      : 0;

    const salesByDay = this.buildSalesByDay(
      orderItemsCurrent.map(i => ({
        created_at: i.order.created_at,
        total_amount: i.unit_price * i.quantity,
        order_id: i.order_id,
      })),
      start,
      end
    );
    const lostValue = abandonedCarts.filter(c => !c.recovered).reduce((s, c) => s + c.total_value, 0);
    const recoveredCount = abandonedCarts.filter(c => c.recovered).length;
    const recoveryRate = abandonedCarts.length > 0 ? (recoveredCount / abandonedCarts.length) * 100 : 0;

    return {
      period: { start, end, key: period },
      comparison: {
        revenue_growth_pct: Math.round(revenueGrowth * 10) / 10,
        orders_growth_pct: Math.round(ordersGrowth * 10) / 10,
        conversion_growth_pct: Math.round(conversionGrowth * 10) / 10,
      },
      kpis: {
        total_revenue: revenueCurrent,
        total_orders: orderIdsCurrent.length,
        completed_orders: completedCurrent,
        pending_orders: ordersCurrent.filter(o => ['pending', 'processing', 'in_transit'].includes(o.status)).length,
        total_products: products.length,
        abandoned_carts_count: abandonedCarts.length,
        abandoned_carts_lost_value: lostValue,
        abandoned_carts_recovery_rate_pct: Math.round(recoveryRate * 10) / 10,
      },
      sales_by_day: salesByDay,
      abandoned_carts: abandonedCarts.slice(0, 20).map(c => ({
        id: c.id,
        user_id: c.user_id,
        total_value: c.total_value,
        abandoned_at: c.abandoned_at,
        recovered: c.recovered,
      })),
      recent_orders: ordersCurrent.map(o => ({
        id: o.id,
        status: o.status,
        total_amount: o.total_amount,
        buyer_name: (o.user as { full_name?: string } | null)?.full_name ?? null,
      })),
      product_ids_from_orders: [...new Set(orderItemsWithProduct.map(i => i.product_id))],
    };
  }

  private getPreviousRange(start: Date, end: Date): { start: Date; end: Date } {
    const diff = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - diff),
      end: new Date(start.getTime()),
    };
  }

  private buildSalesByDay(
    items: { created_at: Date; total_amount: number; order_id?: string }[],
    start: Date,
    end: Date
  ): { date: string; revenue: number; orders: number }[] {
    const byDay: Record<string, { revenue: number; orderIds: Set<string> }> = {};
    const d = new Date(start);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { revenue: 0, orderIds: new Set() };
      d.setDate(d.getDate() + 1);
    }
    for (const o of items) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (byDay[key]) {
        byDay[key].revenue += o.total_amount;
        if (o.order_id) byDay[key].orderIds.add(o.order_id);
      }
    }
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orderIds.size }));
  }

  /** Analytics par produit (top 10, faibles perfs, à booster) */
  async getProductAnalytics(sellerId: string, period: PeriodKey = '30d', customStart?: Date, customEnd?: Date) {
    const { start, end } = getDateRange(period, customStart, customEnd);

    const products = await prisma.product.findMany({
      where: { seller_id: sellerId },
      include: {
        order_items: {
          where: {
            order: {
              created_at: { gte: start, lte: end },
              status: { notIn: ['cancelled'] },
            },
          },
          include: { order: true },
        },
      },
    });

    const productIds = products.map(p => p.id);
    const analyticsRows = await prisma.productAnalytics.findMany({
      where: {
        seller_id: sellerId,
        period_start: { gte: start },
        period_end: { lte: end },
      },
    });
    const analyticsByProduct: Record<string, { total_views: number; total_sales: number; revenue: number; conversion_rate: number; add_to_cart_count: number; abandoned_cart_count: number }> = {};
    for (const a of analyticsRows) {
      analyticsByProduct[a.product_id] = {
        total_views: a.total_views,
        total_sales: a.total_sales,
        revenue: a.revenue,
        conversion_rate: a.conversion_rate,
        add_to_cart_count: a.add_to_cart_count,
        abandoned_cart_count: a.abandoned_cart_count,
      };
    }

    const list = products.map(p => {
      const items = p.order_items || [];
      const sales = items.reduce((s, i) => s + i.quantity, 0);
      const revenue = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const extra = analyticsByProduct[p.id] || {
        total_views: 0,
        total_sales: sales,
        revenue,
        conversion_rate: 0,
        add_to_cart_count: 0,
        abandoned_cart_count: 0,
      };
      return {
        product_id: p.id,
        name: p.name,
        price: p.price,
        total_views: extra.total_views,
        total_sales: extra.total_sales || sales,
        revenue: extra.revenue || revenue,
        conversion_rate: extra.conversion_rate,
        add_to_cart_count: extra.add_to_cart_count,
        abandoned_cart_count: extra.abandoned_cart_count,
      };
    });

    const sorted = [...list].sort((a, b) => b.revenue - a.revenue);
    const top10 = sorted.slice(0, 10);
    const lowPerf = list.filter(p => p.total_views > 0 && p.conversion_rate < 2 && p.total_sales < 5).slice(0, 10);
    const toBoost = list.filter(p => p.add_to_cart_count > 0 && p.total_sales === 0).slice(0, 10);

    return {
      top_10: top10,
      low_performance: lowPerf,
      to_boost: toBoost,
      all: list,
    };
  }

  /** Insights automatiques (règles simples) */
  async getInsights(sellerId: string, period: PeriodKey = '30d') {
    const { start, end } = getDateRange(period);
    const dashboard = await this.getDashboard(sellerId, period);
    const productAnalytics = await this.getProductAnalytics(sellerId, period);
    const insights: string[] = [];

    if (dashboard.comparison.revenue_growth_pct > 10) {
      insights.push(`Vos ventes ont augmenté de ${dashboard.comparison.revenue_growth_pct}% par rapport à la période précédente.`);
    }
    if (dashboard.comparison.revenue_growth_pct < -5) {
      insights.push(`Vos ventes ont baissé de ${Math.abs(dashboard.comparison.revenue_growth_pct)}% par rapport à la période précédente.`);
    }
    if (dashboard.kpis.abandoned_carts_count > 0) {
      insights.push(`${dashboard.kpis.abandoned_carts_count} panier(s) abandonné(s) (valeur perdue: ${Math.round(dashboard.kpis.abandoned_carts_lost_value).toLocaleString()} XOF). Envoyez une relance pour récupérer des ventes.`);
    }
    for (const p of productAnalytics.to_boost) {
      insights.push(`Le produit "${p.name}" a des ajouts au panier mais 0 vente — à mettre en avant ou à ajuster (prix, description).`);
    }
    for (const p of productAnalytics.low_performance.slice(0, 2)) {
      if (p.total_views > 50) {
        insights.push(`"${p.name}" a ${p.total_views} vues mais un taux de conversion faible (${p.conversion_rate}%).`);
      }
    }
    if (insights.length === 0) {
      insights.push('Continuez à promouvoir vos produits et à analyser les tendances pour optimiser vos ventes.');
    }

    return { insights };
  }

  /** Export CSV des données période */
  async exportCsv(sellerId: string, period: PeriodKey = '30d', customStart?: Date, customEnd?: Date): Promise<string> {
    const { start, end } = getDateRange(period, customStart, customEnd);
    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { seller_id: sellerId },
        order: { created_at: { gte: start, lte: end }, status: { notIn: ['cancelled'] } },
      },
      include: { order: true },
    });
    const byOrder = new Map<string, { date: string; status: string; total: number; count: number }>();
    for (const i of orderItems) {
      const o = i.order;
      const row = byOrder.get(o.id);
      const amount = i.unit_price * i.quantity;
      if (row) {
        row.total += amount;
        row.count += i.quantity;
      } else {
        byOrder.set(o.id, {
          date: o.created_at.toISOString().slice(0, 10),
          status: o.status,
          total: amount,
          count: i.quantity,
        });
      }
    }
    const headers = 'date,order_id,status,total_amount,items_count\n';
    const rows = Array.from(byOrder.entries()).map(([id, v]) =>
      `${v.date},${id},${v.status},${v.total},${v.count}`
    ).join('\n');
    return headers + rows;
  }

  /** Géographie (pays des acheteurs) */
  async getGeography(sellerId: string, period: PeriodKey = '30d') {
    const { start, end } = getDateRange(period);
    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { seller_id: sellerId },
        order: { created_at: { gte: start, lte: end }, status: { notIn: ['cancelled'] } },
      },
      include: { order: { include: { user: { select: { country: true } } } } },
    });
    const byOrderId = new Map<string, { country: string; revenue: number }>();
    for (const i of orderItems) {
      const country = i.order.user?.country || 'Non renseigné';
      const rev = i.unit_price * i.quantity;
      const existing = byOrderId.get(i.order_id);
      if (existing) {
        existing.revenue += rev;
      } else {
        byOrderId.set(i.order_id, { country, revenue: rev });
      }
    }
    const byCountry: Record<string, { count: number; revenue: number }> = {};
    for (const v of byOrderId.values()) {
      if (!byCountry[v.country]) byCountry[v.country] = { count: 0, revenue: 0 };
      byCountry[v.country].count += 1;
      byCountry[v.country].revenue += v.revenue;
    }
    return Object.entries(byCountry).map(([country, v]) => ({ country, ...v }));
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();
export default sellerAnalyticsService;
