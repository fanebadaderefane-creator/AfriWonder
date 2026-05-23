import { mobileApiClient } from './mobileClient';

export type SellerDashboardPayload = {
  period?: { start: string; end: string; key: string };
  comparison?: {
    revenue_growth_pct: number;
    orders_growth_pct: number;
    conversion_growth_pct: number;
  };
  kpis?: {
    total_revenue: number;
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    total_products: number;
    abandoned_carts_count: number;
    abandoned_carts_lost_value: number;
    abandoned_carts_recovery_rate_pct: number;
  };
  recent_orders?: {
    id: string;
    status: string;
    total_amount: number;
    buyer_name: string | null;
  }[];
};

export async function fetchSellerDashboard(period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<SellerDashboardPayload | null> {
  const res = await mobileApiClient.get<{ success?: boolean; data?: SellerDashboardPayload }>('/seller/analytics', {
    params: { period },
  });
  return res.data?.data ?? null;
}
