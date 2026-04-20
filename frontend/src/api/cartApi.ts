import apiClient from './client';

/**
 * Client REST pour `/api/cart` (backend `cart.routes.ts`).
 *
 * Le backend stocke un panier persisté par utilisateur (`Cart` Prisma) avec :
 * - `items` : tableau d'objets `{ productId, sellerId, name, price, quantity, image }`
 * - `subtotal`, `coupon_code`, `coupon_discount`, `last_updated`.
 *
 * `breakdown` ajoute `feesBySeller` (un sous-total par vendeur, plus la commission plateforme).
 */

export interface CartLineItem {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  id?: string;
  user_id?: string;
  items: CartLineItem[];
  subtotal: number;
  coupon_code?: string | null;
  coupon_discount?: number;
  last_updated?: string;
}

export interface CartFeeBreakdownEntry {
  sellerId: string;
  store_name?: string;
  phone?: string;
  whatsapp?: string;
  subtotal: number;
  platformFee: number;
  sellerAmount: number;
  itemCount: number;
}

export interface CartBreakdown extends Cart {
  feesBySeller: CartFeeBreakdownEntry[];
  totalFees: number;
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

function normalizeCart(raw: unknown): Cart {
  const r = (raw ?? {}) as Partial<Cart> & { items?: unknown };
  const items = Array.isArray(r.items) ? (r.items as CartLineItem[]) : [];
  return {
    id: r.id,
    user_id: r.user_id,
    items,
    subtotal: typeof r.subtotal === 'number' ? r.subtotal : Number(r.subtotal) || 0,
    coupon_code: r.coupon_code ?? null,
    coupon_discount: typeof r.coupon_discount === 'number' ? r.coupon_discount : Number(r.coupon_discount) || 0,
    last_updated: r.last_updated,
  };
}

export const cartApi = {
  /** GET /api/cart — charge ou crée un panier vide pour l'utilisateur. */
  async get(): Promise<Cart> {
    const res = await apiClient.get('/cart');
    return normalizeCart(unwrap(res.data));
  },

  /** GET /api/cart/breakdown — panier + commission plateforme par vendeur. */
  async breakdown(): Promise<CartBreakdown> {
    const res = await apiClient.get('/cart/breakdown');
    const data = unwrap<Partial<CartBreakdown>>(res.data);
    return {
      ...normalizeCart(data),
      feesBySeller: Array.isArray(data?.feesBySeller) ? data.feesBySeller : [],
      totalFees: typeof data?.totalFees === 'number' ? data.totalFees : Number(data?.totalFees) || 0,
    };
  },

  /** POST /api/cart/add — ajoute / fusionne une ligne (incrément si déjà présent). */
  async add(productId: string, quantity: number = 1): Promise<Cart> {
    const res = await apiClient.post('/cart/add', { productId, quantity });
    return normalizeCart(unwrap(res.data));
  },

  /** PUT /api/cart/update — fixe la quantité d'une ligne (0 = supprime). */
  async update(productId: string, quantity: number): Promise<Cart> {
    const res = await apiClient.put('/cart/update', { productId, quantity });
    return normalizeCart(unwrap(res.data));
  },

  /** DELETE /api/cart/remove/:productId — retire une ligne. */
  async remove(productId: string): Promise<Cart> {
    const res = await apiClient.delete(`/cart/remove/${encodeURIComponent(productId)}`);
    return normalizeCart(unwrap(res.data));
  },

  /** DELETE /api/cart/clear — vide le panier (et reset les coupons). */
  async clear(): Promise<Cart> {
    const res = await apiClient.delete('/cart/clear');
    return normalizeCart(unwrap(res.data));
  },

  /** POST /api/cart/coupon — applique un code promo. */
  async applyCoupon(couponCode: string): Promise<Cart> {
    const res = await apiClient.post('/cart/coupon', { couponCode });
    return normalizeCart(unwrap(res.data));
  },
};

export default cartApi;
