import apiClient from './client';

/**
 * Client REST pour `/api/addresses` (backend `addresses.routes.ts`).
 * Adresse par défaut listée en premier (`is_default = true`).
 */

export interface Address {
  id: string;
  user_id?: string;
  street: string;
  city: string;
  country?: string;
  postal_code?: string | null;
  phone?: string | null;
  type?: 'home' | 'work' | 'other' | string;
  is_default?: boolean;
  created_at?: string;
}

export interface AddressInput {
  street: string;
  city: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  type?: 'home' | 'work' | 'other';
  is_default?: boolean;
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const addressesApi = {
  /** GET /api/addresses — adresse par défaut en tête. */
  async list(): Promise<Address[]> {
    const res = await apiClient.get('/addresses');
    const data = unwrap<Address[] | { addresses: Address[] }>(res.data);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { addresses?: Address[] }).addresses)) {
      return (data as { addresses: Address[] }).addresses;
    }
    return [];
  },

  /** POST /api/addresses */
  async create(input: AddressInput): Promise<Address> {
    const res = await apiClient.post('/addresses', input);
    return unwrap<Address>(res.data);
  },

  /** PUT /api/addresses/:id (partielle) */
  async update(id: string, input: Partial<AddressInput>): Promise<Address> {
    const res = await apiClient.put(`/addresses/${encodeURIComponent(id)}`, input);
    return unwrap<Address>(res.data);
  },

  /** DELETE /api/addresses/:id */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/addresses/${encodeURIComponent(id)}`);
  },
};

export default addressesApi;
