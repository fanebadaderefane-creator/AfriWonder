import apiClient from './client';

/**
 * Client REST pour `/api/restaurants` et `/api/food-orders`
 * (backend `restaurants.routes.ts` + `foodOrders.routes.ts`).
 */

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  phone?: string;
  cuisine_type?: string;
  cover_image?: string;
  logo_url?: string;
  rating?: number;
  is_open?: boolean;
  delivery_fee?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  min_order_amount?: number;
  opening_hours?: Record<string, string>;
  menu_items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  is_available?: boolean;
}

export interface RestaurantListResponse {
  restaurants?: Restaurant[];
  pagination?: { page: number; limit: number; total: number };
}

export interface FoodOrderInput {
  restaurant_id: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
  total_amount: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_instructions?: string;
  payment_method?: 'cash' | 'wallet' | 'mobile_money' | 'card';
  special_requests?: string;
}

export interface FoodOrder {
  id: string;
  restaurant_id: string;
  user_id?: string;
  status: string;
  total_amount: number;
  created_at?: string;
  items?: {
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    name?: string;
  }[];
  status_history?: { status: string; created_at: string; note?: string }[];
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const restaurantsApi = {
  async list(params?: {
    city?: string;
    is_open?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Restaurant[]> {
    const res = await apiClient.get('/restaurants', { params });
    const data = unwrap<RestaurantListResponse | Restaurant[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.restaurants ?? [];
  },

  async get(id: string): Promise<Restaurant> {
    const res = await apiClient.get(`/restaurants/${encodeURIComponent(id)}`);
    return unwrap<Restaurant>(res.data);
  },

  async menu(id: string, category?: string): Promise<MenuItem[]> {
    const res = await apiClient.get(`/restaurants/${encodeURIComponent(id)}/menu-items`, {
      params: category ? { category } : undefined,
    });
    const data = unwrap<MenuItem[] | { items?: MenuItem[] }>(res.data);
    if (Array.isArray(data)) return data;
    return (data as { items?: MenuItem[] })?.items ?? [];
  },
};

export const foodOrdersApi = {
  async list(params?: { page?: number; limit?: number; status?: string }): Promise<FoodOrder[]> {
    const res = await apiClient.get('/food-orders', { params });
    const data = unwrap<{ orders?: FoodOrder[] } | FoodOrder[]>(res.data);
    if (Array.isArray(data)) return data;
    return (data as { orders?: FoodOrder[] })?.orders ?? [];
  },

  async get(id: string): Promise<FoodOrder> {
    const res = await apiClient.get(`/food-orders/${encodeURIComponent(id)}`);
    return unwrap<FoodOrder>(res.data);
  },

  async create(input: FoodOrderInput): Promise<FoodOrder> {
    const res = await apiClient.post('/food-orders', input);
    return unwrap<FoodOrder>(res.data);
  },
};
