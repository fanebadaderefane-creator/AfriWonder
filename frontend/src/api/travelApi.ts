/**
 * Clients API Travel — bus Mali + hôtels.
 */
import apiClient from './client';

export interface BusCompany {
  id: string; name: string; logo_url?: string | null; phone?: string | null;
}

export interface BusRoute {
  id: string;
  company_id: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  duration_min: number;
  price_fcfa: number;
  bus_type: string;
  seats_total: number;
  days_of_week: number[];
  company?: BusCompany;
}

export interface BusBooking {
  id: string;
  route_id: string;
  passenger_name: string;
  passenger_phone: string;
  travel_date: string;
  seats: number;
  total_fcfa: number;
  status: string;
  payment_status: string;
  reference: string;
  route?: BusRoute;
  created_at: string;
}

export const busApi = {
  async searchRoutes(origin?: string, destination?: string): Promise<BusRoute[]> {
    const { data } = await apiClient.get('/bus/routes', { params: { origin, destination } });
    return data?.data ?? [];
  },
  async listCities(): Promise<string[]> {
    const { data } = await apiClient.get('/bus/cities');
    return data?.data ?? [];
  },
  async createBooking(payload: {
    route_id: string; travel_date: string; seats: number;
    passenger_name: string; passenger_phone: string;
    payment_method?: 'wallet' | 'orange_money' | 'wave' | 'mtn_money' | 'moov_money';
  }): Promise<BusBooking> {
    const { data } = await apiClient.post('/bus/bookings', payload);
    return data?.data;
  },
  async myBookings(): Promise<BusBooking[]> {
    const { data } = await apiClient.get('/bus/bookings');
    return data?.data ?? [];
  },
};

export interface Hotel {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  country: string;
  star_rating?: number | null;
  amenities: string[];
  images: string[];
  price_fcfa_from?: number | null;
  rooms?: HotelRoom[];
}

export interface HotelRoom {
  id: string;
  hotel_id: string;
  name: string;
  description?: string | null;
  capacity: number;
  price_fcfa: number;
  images: string[];
  amenities: string[];
}

export interface HotelBooking {
  id: string;
  hotel?: Hotel;
  room?: HotelRoom;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  total_fcfa: number;
  status: string;
  payment_status: string;
  reference: string;
}

export const hotelsApi = {
  async search(city?: string): Promise<Hotel[]> {
    const { data } = await apiClient.get('/hotels', { params: { city } });
    return data?.data ?? [];
  },
  async getDetail(id: string): Promise<Hotel | null> {
    try {
      const { data } = await apiClient.get(`/hotels/${encodeURIComponent(id)}`);
      return data?.data ?? null;
    } catch { return null; }
  },
  async createBooking(payload: {
    hotel_id: string; room_id: string;
    check_in: string; check_out: string; guests_count: number;
    notes?: string;
    payment_method?: 'wallet' | 'orange_money' | 'wave' | 'mtn_money' | 'moov_money';
  }): Promise<HotelBooking> {
    const { data } = await apiClient.post('/hotels/bookings', payload);
    return data?.data;
  },
  async myBookings(): Promise<HotelBooking[]> {
    const { data } = await apiClient.get('/hotels/bookings/me');
    return data?.data ?? [];
  },
};

export default { busApi, hotelsApi };
