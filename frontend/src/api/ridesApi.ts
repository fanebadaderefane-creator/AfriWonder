import apiClient from './client';

/** Client REST pour `/api/rides` et `/api/drivers` (backend rides/drivers routes). */

export interface Driver {
  id: string;
  user_id?: string;
  full_name?: string;
  phone?: string;
  vehicle_type?: 'moto' | 'taxi' | 'comfort' | 'van' | string;
  license_plate?: string;
  rating?: number;
  total_rides?: number;
  current_lat?: number;
  current_lng?: number;
  is_available?: boolean;
  avatar?: string;
  distance_km?: number;
}

export interface Ride {
  id: string;
  passenger_id?: string;
  driver_id?: string;
  pickup_location: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_location: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  vehicle_type?: string;
  status: string;
  fare_amount?: number;
  payment_method?: string;
  notes?: string;
  created_at?: string;
  driver?: Driver;
}

export interface RideListResponse {
  rides?: Ride[];
  pagination?: { page: number; limit: number; total: number };
}

export interface RideRequest {
  pickup_location: string;
  dropoff_location: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  vehicle_type?: string;
  payment_method?: string;
  notes?: string;
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const driversApi = {
  /** GET /drivers/nearby — public, retourne les chauffeurs disponibles autour de (lat,lng). */
  async nearby(params: {
    lat: number;
    lng: number;
    vehicle_type?: string;
    limit?: number;
    max_km?: number;
  }): Promise<Driver[]> {
    const res = await apiClient.get('/drivers/nearby', { params });
    const data = unwrap<{ drivers?: Driver[] } | Driver[]>(res.data);
    if (Array.isArray(data)) return data;
    return (data as { drivers?: Driver[] })?.drivers ?? [];
  },

  async get(id: string): Promise<Driver> {
    const res = await apiClient.get(`/drivers/${encodeURIComponent(id)}`);
    return unwrap<Driver>(res.data);
  },
};

export const ridesApi = {
  async list(params?: {
    as?: 'passenger' | 'driver';
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<Ride[]> {
    const res = await apiClient.get('/rides', { params });
    const data = unwrap<RideListResponse | Ride[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.rides ?? [];
  },

  async get(id: string): Promise<Ride> {
    const res = await apiClient.get(`/rides/${encodeURIComponent(id)}`);
    return unwrap<Ride>(res.data);
  },

  async request(input: RideRequest): Promise<Ride> {
    const res = await apiClient.post('/rides', input);
    return unwrap<Ride>(res.data);
  },

  async updateStatus(id: string, status: string, extra?: { cancellation_fee?: number; cancellation_reason?: string }): Promise<Ride> {
    const res = await apiClient.patch(`/rides/${encodeURIComponent(id)}/status`, { status, ...extra });
    return unwrap<Ride>(res.data);
  },
};
