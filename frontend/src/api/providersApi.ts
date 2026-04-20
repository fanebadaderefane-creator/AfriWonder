import apiClient from './client';

/**
 * Client REST pour `/api/providers` (backend `providers.routes.ts`).
 * Le filtre `category` correspond à `service_categories has X` côté backend.
 */

export interface ServiceProvider {
  id: string;
  user_id?: string;
  display_name?: string;
  full_name?: string;
  bio?: string;
  service_categories?: string[];
  service_radius_km?: number;
  location_type?: 'mobile' | 'shop' | 'hybrid' | string;
  city?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  avatar_url?: string;
  cover_image?: string;
  rating?: number;
  total_jobs?: number;
  is_verified?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | string;
  base_price?: number;
  currency?: string;
}

export interface ProviderListResponse {
  providers?: ServiceProvider[];
  pagination?: { page: number; limit: number; total: number };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const providersApi = {
  /**
   * GET /providers
   * @param params.category  Filtre `service_categories has`. Valeurs courantes :
   *   - `childcare`, `vehicle_rental`, `travel`, `cleaning`, `beauty`, `tutoring`, ...
   */
  async list(params?: {
    category?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ServiceProvider[]> {
    const res = await apiClient.get('/providers', { params });
    const data = unwrap<ProviderListResponse | ServiceProvider[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.providers ?? [];
  },

  async get(id: string): Promise<ServiceProvider> {
    const res = await apiClient.get(`/providers/${encodeURIComponent(id)}`);
    return unwrap<ServiceProvider>(res.data);
  },

  async services(id: string): Promise<unknown[]> {
    const res = await apiClient.get(`/providers/${encodeURIComponent(id)}/services`);
    const data = unwrap<unknown[] | { services?: unknown[] }>(res.data);
    if (Array.isArray(data)) return data;
    return (data as { services?: unknown[] })?.services ?? [];
  },
};

export default providersApi;
