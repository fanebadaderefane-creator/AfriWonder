import apiClient from './client';

/**
 * Client REST pour `/api/doctors` (backend `doctors.routes.ts`).
 *
 * Note opérationnelle : ce module n'est monté côté serveur que lorsque
 * `TELEMEDICINE_ENABLED=true` ou `NODE_ENV !== 'production'`. Si le backend
 * renvoie 404, considérer la fonctionnalité comme non disponible dans la
 * région et afficher un message clair côté client (pas de crash).
 */

export interface Doctor {
  id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  specialty: string;
  bio?: string;
  city?: string;
  country?: string;
  clinic_name?: string;
  clinic_address?: string;
  consultation_fee?: number;
  currency?: string;
  rating?: number;
  total_reviews?: number;
  avatar_url?: string;
  is_verified?: boolean;
  available_today?: boolean;
  next_available?: string;
}

export interface DoctorListResponse {
  doctors?: Doctor[];
  pagination?: { page: number; limit: number; total: number };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

/**
 * Lance une requête en gérant un 404 « endpoint non monté » comme un cas
 * fonctionnel : le caller reçoit `null` et affiche un message dédié.
 */
async function safeGet<T>(url: string, params?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await apiClient.get(url, { params });
    return unwrap<T>(res.data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export const doctorsApi = {
  /**
   * GET /doctors — liste publique. Renvoie `null` si le module
   * télémédecine est désactivé côté serveur (404).
   */
  async list(params?: { specialty?: string; city?: string; page?: number; limit?: number }): Promise<Doctor[] | null> {
    const data = await safeGet<DoctorListResponse | Doctor[]>('/doctors', params);
    if (data === null) return null;
    if (Array.isArray(data)) return data;
    return data?.doctors ?? [];
  },

  async get(id: string): Promise<Doctor> {
    const res = await apiClient.get(`/doctors/${encodeURIComponent(id)}`);
    return unwrap<Doctor>(res.data);
  },
};

export default doctorsApi;
