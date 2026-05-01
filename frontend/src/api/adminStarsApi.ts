/**
 * API admin du module Paid Video Calls (User ↔ Star).
 * Backend : `/api/admin/stars/*`. Séparé du super-app admin API — le module
 * est isolé par design.
 */
import apiClient from './client';
import type { StarBooking, StarProfile } from './starsApi';

export interface AdminStarKpis {
  profiles: { total: number; active: number; verified: number };
  bookings: {
    total: number;
    completed: number;
    disputed: number;
    no_show_fan?: number;
    no_show_star?: number;
    upcoming?: number;
  };
  revenue_fcfa: number;
  platform_fee_fcfa: number;
  refunds_fcfa: number;
  open_disputes: number;
}

export interface AdminStarDispute {
  id: string;
  booking_id: string;
  reason: string;
  description?: string | null;
  status: 'open' | 'investigating' | 'resolved_refund_full' | 'resolved_refund_partial' | 'resolved_rejected';
  resolution_note?: string | null;
  refund_amount_fcfa?: number;
  created_at: string;
  booking?: StarBooking;
  opener?: { id: string; username: string | null };
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get(url, { params });
  return data;
}
async function post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.post(url, body ?? {});
  return data;
}

export const adminStarsApi = {
  async kpis(): Promise<AdminStarKpis | null> {
    try {
      const data = await get<{ success: boolean; kpis: AdminStarKpis }>('/admin/stars/kpis');
      return data.kpis ?? null;
    } catch { return null; }
  },

  async listStars(search?: string): Promise<StarProfile[]> {
    const data = await get<{ success: boolean; stars: StarProfile[] }>('/admin/stars/stars', { search });
    return data.stars || [];
  },

  async verifyStar(id: string, verified: boolean): Promise<void> {
    await post<unknown>(`/admin/stars/stars/${id}/verify`, { verified });
  },

  async banStar(id: string, banned: boolean, reason?: string): Promise<void> {
    await post<unknown>(`/admin/stars/stars/${id}/ban`, { banned, reason });
  },

  async listBookings(status?: string): Promise<StarBooking[]> {
    const data = await get<{ success: boolean; bookings: StarBooking[] }>('/admin/stars/bookings', { status });
    return data.bookings || [];
  },

  async getBooking(id: string): Promise<StarBooking> {
    const data = await get<{ success: boolean; booking: StarBooking }>(`/admin/stars/bookings/${id}`);
    return data.booking;
  },

  async forceRefund(id: string, amount_fcfa: number, reason: string): Promise<void> {
    await post<unknown>(`/admin/stars/bookings/${id}/force-refund`, { amount_fcfa, reason });
  },

  async listDisputes(status = 'open'): Promise<AdminStarDispute[]> {
    const data = await get<{ success: boolean; disputes: AdminStarDispute[] }>('/admin/stars/disputes', { status });
    return data.disputes || [];
  },

  async resolveDispute(
    id: string,
    resolution: 'refund_full' | 'refund_partial' | 'reject',
    amount_fcfa?: number,
    note?: string,
  ): Promise<void> {
    await post<unknown>(`/admin/stars/disputes/${id}/resolve`, { resolution, amount_fcfa, note });
  },

  async runReaper(): Promise<{ completed: number; noShowStars: number; noShowFans: number; cancelledPending: number } | null> {
    try {
      const data = await post<{ success: boolean; completed: number; noShowStars: number; noShowFans: number; cancelledPending: number }>('/admin/stars/reaper-run');
      return data;
    } catch { return null; }
  },
};

export default adminStarsApi;
