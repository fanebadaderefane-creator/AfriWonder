import apiClient from './client';

/**
 * Client REST pour `/api/orders` (backend `orders.routes.ts` +
 * `order.service.ts`).
 *
 * Création de commande (`POST /orders`) :
 *   - le backend lit le panier serveur OU un tableau `items` passé dans le body
 *   - retourne soit une commande unique (mono-vendeur) soit `{ orders, count }`
 *     (multi-vendeurs : une commande par vendeur).
 *
 * Paiement : `POST /orders` ne déclenche PAS le paiement. L'app appelle
 * ensuite `/payments/wallet/pay-order`, `/payments/orange-money` ou
 * `/payments/wave` avec le `orderId` retourné.
 */

export interface OrderItem {
  id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    images?: string[];
    price?: number;
  } | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  user_id?: string;
  seller_id?: string;
  status: string;
  total_amount: number;
  shipping_address?: string;
  shipping_city?: string;
  payment_method?: string;
  payment_status?: string;
  source?: 'marketplace' | 'live' | string;
  live_id?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
  shipping?: unknown;
  payments?: unknown[];
}

export interface OrderListResponse {
  orders: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

export interface CreateOrderPayload {
  /** Texte libre (rue, ville, indications). Obligatoire côté service. */
  shipping_address: string;
  /** Méthode de paiement : `orange_money`, `wave`, `wallet`, `stripe`, etc. */
  payment_method: string;
  /** Optionnel — sinon le panier serveur est utilisé. */
  items?: Array<{ productId: string; quantity: number }>;
  shipping_city?: string;
  source?: 'marketplace' | 'live';
  live_id?: string;
  shipping_amount?: number;
  logistics_fee?: number;
  insurance_amount?: number;
  priority_fee?: number;
}

export type CreateOrderResponse =
  | { mode: 'single'; order: Order }
  | { mode: 'multi'; orders: Order[]; count: number };

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const ordersApi = {
  /**
   * GET /api/orders — liste paginée.
   * `as=seller` pour la file vendeur, sinon vue acheteur.
   */
  async list(params?: {
    page?: number;
    limit?: number;
    as?: 'buyer' | 'seller';
    live_id?: string;
  }): Promise<OrderListResponse> {
    const res = await apiClient.get('/orders', { params });
    const data = unwrap<OrderListResponse>(res.data);
    return {
      orders: Array.isArray(data?.orders) ? data.orders : [],
      pagination: data?.pagination,
    };
  },

  /** GET /api/orders/:id */
  async get(id: string): Promise<Order> {
    const res = await apiClient.get(`/orders/${encodeURIComponent(id)}`);
    return unwrap<Order>(res.data);
  },

  /**
   * POST /api/orders — crée la commande à partir du panier serveur (par défaut)
   * ou d'un `items` fourni. Le backend renvoie soit une commande unique
   * (`{ data: Order }`), soit `{ data: { orders, count } }` pour multi-vendeurs.
   */
  async create(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const res = await apiClient.post('/orders', payload);
    const data = unwrap<Order | { orders: Order[]; count: number }>(res.data);
    if (data && typeof data === 'object' && 'orders' in data && Array.isArray((data as { orders: Order[] }).orders)) {
      const m = data as { orders: Order[]; count: number };
      return { mode: 'multi', orders: m.orders, count: m.count ?? m.orders.length };
    }
    return { mode: 'single', order: data as Order };
  },

  /** PATCH /api/orders/:id/status */
  async updateStatus(id: string, status: string): Promise<Order> {
    const res = await apiClient.patch(`/orders/${encodeURIComponent(id)}/status`, { status });
    return unwrap<Order>(res.data);
  },

  /** POST /api/orders/:id/cancel */
  async cancel(id: string, reason?: string): Promise<Order> {
    const res = await apiClient.post(`/orders/${encodeURIComponent(id)}/cancel`, { reason });
    return unwrap<Order>(res.data);
  },

  /** POST /api/orders/:id/confirm-reception */
  async confirmReception(id: string): Promise<Order> {
    const res = await apiClient.post(`/orders/${encodeURIComponent(id)}/confirm-reception`, {});
    return unwrap<Order>(res.data);
  },
};

export default ordersApi;
