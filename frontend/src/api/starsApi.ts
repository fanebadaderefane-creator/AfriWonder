/**
 * Client API Paid Video Calls (User ↔ Star) — module ISOLÉ.
 * Backend : `/api/stars/*` (public + connecté) et `/api/admin/stars/*` (admin).
 *
 * Toutes les fonctions renvoient une structure claire et propagent les erreurs
 * humaines (le backend renvoie `error.message` en français).
 */
import apiClient from './client';

export type StarDuration = 5 | 10 | 15;

export interface StarUser {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_verified?: boolean;
  bio?: string | null;
}

export type StarCategory = 'Musicians' | 'Comedians' | 'Coachs' | 'Influencer' | 'Media' | 'Mentors' | 'Other';
export type StarTier = 'standard' | 'premium';

export const STAR_CATEGORIES: StarCategory[] = [
  'Musicians',
  'Comedians',
  'Coachs',
  'Influencer',
  'Media',
  'Mentors',
  'Other',
];

export interface StarProfile {
  id: string;
  user_id: string;
  display_id?: number | null;
  category?: StarCategory | null;
  country?: string | null;
  tier?: StarTier;
  is_active: boolean;
  is_verified: boolean;
  is_featured?: boolean;
  is_banned: boolean;
  ban_reason?: string | null;
  headline?: string | null;
  bio?: string | null;
  languages: string[];
  tags: string[];
  price_fcfa_5min: number | null;
  price_fcfa_10min: number | null;
  price_fcfa_15min: number | null;
  max_calls_per_day: number;
  max_extensions_per_call: number;
  currency: string;
  rating_avg: number;
  rating_count: number;
  calls_completed: number;
  calls_no_show: number;
  total_earnings_fcfa: number;
  created_at: string;
  updated_at: string;
  user?: StarUser;
  availability_rules?: StarAvailabilityRule[];
}

export interface StarHomeCategory {
  category: StarCategory;
  count: number;
  preview: StarProfile[];
}

export interface StarHomeData {
  featured: StarProfile | null;
  stories: StarProfile[];
  categories: StarHomeCategory[];
}

export interface StarAvailabilityRule {
  id?: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  timezone?: string;
  is_blocked?: boolean;
}

export interface StarBooking {
  id: string;
  star_profile_id: string;
  fan_user_id: string;
  star_user_id: string;
  price_fcfa: number;
  duration_minutes: number;
  extra_minutes: number;
  currency: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actually_started_at: string | null;
  actually_ended_at: string | null;
  status:
    | 'pending_payment'
    | 'confirmed'
    | 'ongoing'
    | 'completed'
    | 'cancelled'
    | 'no_show_fan'
    | 'no_show_star'
    | 'disputed'
    | 'refunded';
  payment_method: string | null;
  platform_fee_fcfa: number;
  star_earnings_fcfa: number;
  agora_channel: string;
  refund_amount_fcfa: number;
  fan_notes?: string | null;
  star_profile?: StarProfile;
  fan?: StarUser;
  call_session?: StarCallSession | null;
  extensions?: StarBookingExtension[];
  rating?: StarRating | null;
}

export interface StarCallSession {
  id: string;
  booking_id: string;
  fan_uid: number;
  star_uid: number;
  fan_joined_at: string | null;
  star_joined_at: string | null;
  both_present_at: string | null;
  last_heartbeat_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
}

export interface StarBookingExtension {
  id: string;
  booking_id: string;
  minutes: number;
  price_fcfa: number;
  status: string;
  created_at: string;
}

export interface StarRating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  fan?: StarUser;
}

export interface StarAgoraToken {
  app_id: string;
  channel: string;
  uid: number;
  token: string;
  expire_at: number;
  role: 'fan' | 'star';
}

export interface StarSlot {
  start: string;
  end: string;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get(url, { params });
  return data;
}
async function post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.post(url, body ?? {});
  return data;
}
async function patch<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.patch(url, body ?? {});
  return data;
}
async function put<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.put(url, body ?? {});
  return data;
}

/** Init paiement Orange Money après POST `/stars/bookings` (`payment_method: orange_money`). */
export type StarBookingPaymentInit = {
  paymentUrl?: string;
  orderId: string;
  reference?: string;
  provider: string;
};

export const starsApi = {
  // -------- DISCOVERY PUBLIC --------
  async discover(params: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    tag?: string;
    category?: string;
    verified_only?: boolean;
  } = {}) {
    const data = await get<{ success: boolean; items: StarProfile[]; next_cursor: string | null }>(
      '/stars/discover',
      params,
    );
    return { items: data.items || [], next_cursor: data.next_cursor ?? null };
  },

  /** Page d'accueil discovery : featured + stories + catégories en 1 appel. */
  async discoverHome(): Promise<StarHomeData> {
    const data = await get<{
      success: boolean;
      featured: StarProfile | null;
      stories: StarProfile[];
      categories: StarHomeCategory[];
    }>('/stars/home');
    return {
      featured: data.featured ?? null,
      stories: data.stories || [],
      categories: data.categories || [],
    };
  },

  async getProfile(starProfileId: string): Promise<StarProfile> {
    const data = await get<{ success: boolean; profile: StarProfile }>(`/stars/profile/${starProfileId}`);
    return data.profile;
  },

  async listRatings(starProfileId: string, limit = 20): Promise<StarRating[]> {
    const data = await get<{ success: boolean; ratings: StarRating[] }>(`/stars/profile/${starProfileId}/ratings`, { limit });
    return data.ratings || [];
  },

  async listSlots(starProfileId: string, duration: StarDuration, day: string, timezone?: string) {
    const data = await get<{ success: boolean; slots: StarSlot[]; price_fcfa?: number; currency?: string }>(
      `/stars/profile/${starProfileId}/slots`,
      { duration, day, timezone },
    );
    return { slots: data.slots || [], price_fcfa: data.price_fcfa, currency: data.currency };
  },

  // -------- BOOKINGS (FAN) --------
  async createBooking(input: {
    star_profile_id: string;
    duration_minutes: StarDuration;
    scheduled_start_at: string;
    fan_notes?: string;
    payment_method?: 'wallet' | 'orange_money';
    payment_phone?: string;
  }): Promise<{ booking: StarBooking; payment?: StarBookingPaymentInit | null }> {
    const data = await post<{
      success: boolean;
      booking: StarBooking;
      payment?: StarBookingPaymentInit;
    }>('/stars/bookings', input);
    return { booking: data.booking, payment: data.payment ?? null };
  },

  async listMyBookings(as: 'fan' | 'star' = 'fan', status?: string): Promise<StarBooking[]> {
    const data = await get<{ success: boolean; bookings: StarBooking[] }>('/stars/bookings/mine', { as, status });
    return data.bookings || [];
  },

  async getBooking(bookingId: string): Promise<StarBooking> {
    const data = await get<{ success: boolean; booking: StarBooking }>(`/stars/bookings/${bookingId}`);
    return data.booking;
  },

  async cancelBooking(bookingId: string, as: 'fan' | 'star' = 'fan', reason?: string): Promise<StarBooking> {
    const data = await post<{ success: boolean; booking: StarBooking }>(`/stars/bookings/${bookingId}/cancel`, { as, reason });
    return data.booking;
  },

  // -------- CALL --------
  async getAgoraToken(bookingId: string): Promise<StarAgoraToken> {
    const { success: _s, ...rest } = await post<StarAgoraToken & { success: boolean }>(
      `/stars/bookings/${bookingId}/agora-token`,
      {},
    );
    return rest as StarAgoraToken;
  },

  async joinCall(bookingId: string) {
    return post<{ success: boolean; session: StarCallSession }>(`/stars/bookings/${bookingId}/join`);
  },

  async heartbeat(bookingId: string) {
    return post<{ success: boolean }>(`/stars/bookings/${bookingId}/heartbeat`);
  },

  async endCall(bookingId: string, reason = 'hangup') {
    const data = await post<{ success: boolean; booking: StarBooking }>(`/stars/bookings/${bookingId}/end`, { reason });
    return data.booking;
  },

  async extendCall(bookingId: string) {
    return post<{ success: boolean; booking: StarBooking; extension: StarBookingExtension }>(
      `/stars/bookings/${bookingId}/extend`,
    );
  },

  // -------- RATING / DISPUTE --------
  async rateBooking(bookingId: string, rating: number, review?: string) {
    const data = await post<{ success: boolean; rating: StarRating }>(`/stars/bookings/${bookingId}/rate`, { rating, review });
    return data.rating;
  },

  async openDispute(bookingId: string, reason: string, description?: string) {
    return post<{ success: boolean; dispute: unknown }>(`/stars/bookings/${bookingId}/dispute`, { reason, description });
  },

  async addDisputeMessage(disputeId: string, body: string) {
    return post<{ success: boolean; message: unknown }>(`/stars/disputes/${disputeId}/messages`, { body });
  },

  async listMyDisputes() {
    const data = await get<{ success: boolean; disputes: unknown[] }>('/stars/disputes/mine');
    return data.disputes || [];
  },

  // -------- STAR MODE --------
  async getMyStarProfile(): Promise<StarProfile | null> {
    const data = await get<{ success: boolean; profile: StarProfile | null }>('/stars/me/star');
    return data.profile;
  },

  async becomeStar(input: {
    headline?: string;
    bio?: string;
    languages?: string[];
    tags?: string[];
    category?: StarCategory | null;
    country?: string | null;
    tier?: StarTier;
  }): Promise<StarProfile> {
    const data = await post<{ success: boolean; profile: StarProfile }>('/stars/me/star/activate', input);
    return data.profile;
  },

  async updateStarProfile(input: {
    headline?: string | null;
    bio?: string | null;
    languages?: string[];
    tags?: string[];
    price_fcfa_5min?: number | null;
    price_fcfa_10min?: number | null;
    price_fcfa_15min?: number | null;
    max_calls_per_day?: number;
    category?: StarCategory | null;
    country?: string | null;
  }): Promise<StarProfile> {
    const data = await patch<{ success: boolean; profile: StarProfile }>('/stars/me/star', input);
    return data.profile;
  },

  async toggleActive(active: boolean): Promise<StarProfile> {
    const data = await post<{ success: boolean; profile: StarProfile }>('/stars/me/star/toggle', { active });
    return data.profile;
  },

  async setAvailability(rules: StarAvailabilityRule[]): Promise<StarAvailabilityRule[]> {
    const data = await put<{ success: boolean; rules: StarAvailabilityRule[] }>('/stars/me/star/availability', { rules });
    return data.rules;
  },

  async getMyStarStats(): Promise<StarStats> {
    const data = await get<{ success: boolean; stats: StarStats }>('/stars/me/star/stats');
    return data.stats;
  },
};

export interface StarStatsBooking {
  id: string;
  duration_minutes: number;
  extra_minutes: number;
  scheduled_start_at: string;
  scheduled_end_at: string;
  status: string;
  price_fcfa: number;
  star_earnings_fcfa: number;
  fan: { id: string; username: string | null; full_name: string | null; profile_image: string | null } | null;
}

export interface StarStatsCompleted {
  id: string;
  duration_minutes: number;
  extra_minutes: number;
  star_earnings_fcfa: number;
  actually_ended_at: string | null;
  fan: { username: string | null; full_name: string | null; profile_image: string | null } | null;
}

export interface StarStats {
  balance: {
    available_fcfa: number;
    pending_fcfa: number;
    total_earned_fcfa: number;
    currency: string;
  };
  calls: {
    today: number;
    this_week: number;
    this_month: number;
    completed_total: number;
    no_show_total: number;
    max_per_day: number;
  };
  rating: {
    avg: number;
    count: number;
  };
  upcoming_bookings: StarStatsBooking[];
  recent_completed: StarStatsCompleted[];
  open_disputes_count: number;
  is_active: boolean;
}

export default starsApi;
