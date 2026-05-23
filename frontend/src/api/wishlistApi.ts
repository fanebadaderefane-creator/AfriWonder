import apiClient from './client';

export interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  images?: string[] | null;
  category?: string | null;
  stock?: number | null;
  seller?: { id: string; username?: string | null; profile_image?: string | null } | null;
}

export interface WishlistRow {
  id: string;
  product_id: string;
  product: WishlistProduct;
}

export interface WishlistListResult {
  items: WishlistRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

const wishlistApi = {
  async list(page = 1, limit = 40): Promise<WishlistListResult> {
    const res = await apiClient.get('/wishlist', { params: { page, limit } });
    return unwrap<WishlistListResult>(res.data);
  },

  async remove(productId: string): Promise<void> {
    await apiClient.delete(`/wishlist/remove/${encodeURIComponent(productId)}`);
  },
};

export default wishlistApi;
