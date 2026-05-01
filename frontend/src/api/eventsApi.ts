import apiClient from './client';

/** Client REST pour `/api/events` (backend `events.routes.ts`). */

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  cover_image?: string;
  images?: string[];
  category?: string;
  event_type?: 'concert' | 'festival' | 'conference' | 'sports' | 'community' | string;
  location?: string;
  city?: string;
  country?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  status?: string;
  ticket_price?: number;
  ticket_types?: {
    id: string;
    name: string;
    price: number;
    quantity_available?: number;
  }[];
  organizer?: { id: string; username?: string; display_name?: string; avatar?: string };
}

export interface EventListResponse {
  events?: EventItem[];
  pagination?: { page: number; limit: number; total: number };
}

export interface EventBookingInput {
  phone: string;
  quantity: number;
  ticket_type?: string;
  payment_method?: 'orange_money' | 'wave' | 'wallet' | string;
  city?: string;
  source?: string;
}

export interface EventBookingResponse {
  booking?: Record<string, unknown>;
  payment_url?: string;
  transactionId?: string;
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const eventsApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    category?: string;
    location?: string;
    event_type?: string;
    search?: string;
    startDate?: string;
  }): Promise<EventItem[]> {
    const res = await apiClient.get('/events', { params });
    const data = unwrap<EventListResponse | EventItem[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.events ?? [];
  },

  async get(id: string): Promise<EventItem> {
    const res = await apiClient.get(`/events/${encodeURIComponent(id)}`);
    return unwrap<EventItem>(res.data);
  },

  /** POST /events/:id/book — réservation + paiement Orange Money. */
  async book(id: string, input: EventBookingInput): Promise<EventBookingResponse> {
    const res = await apiClient.post(`/events/${encodeURIComponent(id)}/book`, input);
    return unwrap<EventBookingResponse>(res.data);
  },
};

export default eventsApi;
