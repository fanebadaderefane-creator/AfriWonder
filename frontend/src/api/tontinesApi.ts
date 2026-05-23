/**
 * Client Tontines — épargne rotative africaine.
 * Backend : `backend/src/routes/tontines.routes.ts`.
 */
import apiClient from './client';

export type TontineFrequency = 'weekly' | 'biweekly' | 'monthly';
export type TontineStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface TontineMember {
  id: string;
  tontine_id: string;
  user_id: string;
  payout_order: number;
  status: 'invited' | 'accepted' | 'declined' | 'removed';
  joined_at: string;
  user?: { id: string; username: string; full_name?: string | null; profile_image?: string | null };
}

export interface TontineCycle {
  id: string;
  tontine_id: string;
  cycle_number: number;
  beneficiary_user_id: string;
  total_amount: number;
  status: 'pending' | 'collecting' | 'completed' | 'defaulted';
  opens_at: string;
  due_at: string;
  paid_at?: string | null;
  contributions?: Record<string, { paid: boolean; amount: number; paid_at: string }> | null;
  beneficiary?: { id: string; username: string; full_name?: string | null; profile_image?: string | null };
}

export interface Tontine {
  id: string;
  name: string;
  description?: string | null;
  creator_id: string;
  currency: string;
  contribution_amount: number;
  max_members: number;
  frequency: TontineFrequency;
  status: TontineStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  payout_order_mode: 'random' | 'manual';
  invite_code: string;
  created_at: string;
  members?: TontineMember[];
  cycles?: TontineCycle[];
  creator?: { id: string; username: string; full_name?: string | null; profile_image?: string | null };
}

export const tontinesApi = {
  async listMine(): Promise<Tontine[]> {
    const { data } = await apiClient.get('/tontines');
    return data?.data ?? [];
  },

  async create(payload: {
    name: string;
    description?: string;
    contribution_amount: number;
    max_members: number;
    frequency: TontineFrequency;
    payout_order_mode?: 'random' | 'manual';
    currency?: string;
  }): Promise<Tontine> {
    const { data } = await apiClient.post('/tontines', payload);
    return data?.data;
  },

  async joinByCode(inviteCode: string): Promise<TontineMember> {
    const { data } = await apiClient.post('/tontines/join', { invite_code: inviteCode });
    return data?.data;
  },

  async getDetail(id: string): Promise<{ tontine: Tontine; isMember: boolean } | null> {
    try {
      const { data } = await apiClient.get(`/tontines/${encodeURIComponent(id)}`);
      return data?.data ?? null;
    } catch {
      return null;
    }
  },

  async start(id: string): Promise<Tontine> {
    const { data } = await apiClient.post(`/tontines/${encodeURIComponent(id)}/start`);
    return data?.data;
  },

  async contribute(id: string, cycleNumber: number): Promise<TontineCycle> {
    const { data } = await apiClient.post(`/tontines/${encodeURIComponent(id)}/contribute`, {
      cycle_number: cycleNumber,
    });
    return data?.data;
  },

  async leave(id: string): Promise<void> {
    await apiClient.post(`/tontines/${encodeURIComponent(id)}/leave`);
  },

  async cancel(id: string): Promise<void> {
    await apiClient.post(`/tontines/${encodeURIComponent(id)}/cancel`);
  },
};

export default tontinesApi;
