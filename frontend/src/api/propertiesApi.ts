import apiClient from './client';

/** Client REST pour `/api/properties` (backend `properties.routes.ts`). */

export interface Property {
  id: string;
  title: string;
  description?: string;
  listing_type: 'rent' | 'sale' | 'land' | string;
  property_type?: 'apartment' | 'house' | 'land' | 'commercial' | string;
  address: string;
  city?: string;
  country?: string;
  price: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  surface_m2?: number;
  images?: string[];
  cover_image?: string;
  status?: 'pending' | 'available' | 'sold' | 'rented' | string;
  owner?: { id: string; username?: string; display_name?: string; avatar?: string; phone?: string };
  created_at?: string;
}

export interface PropertyListResponse {
  properties?: Property[];
  pagination?: { page: number; limit: number; total: number };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const propertiesApi = {
  async list(params?: {
    listing_type?: 'rent' | 'sale' | 'land';
    property_type?: string;
    city?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Property[]> {
    const res = await apiClient.get('/properties', { params });
    const data = unwrap<PropertyListResponse | Property[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.properties ?? [];
  },

  async get(id: string): Promise<Property> {
    const res = await apiClient.get(`/properties/${encodeURIComponent(id)}`);
    return unwrap<Property>(res.data);
  },

  /** POST /properties/:id/visit-request */
  async requestVisit(id: string, requestedDate?: string, message?: string) {
    const res = await apiClient.post(`/properties/${encodeURIComponent(id)}/visit-request`, {
      requested_date: requestedDate,
      message,
    });
    return unwrap(res.data);
  },
};

export default propertiesApi;
