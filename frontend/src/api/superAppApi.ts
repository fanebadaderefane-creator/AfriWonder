/**
 * Clients API super-app — Live commerce, Factures utilitaires, Épargne, Cartes virtuelles.
 * Un seul fichier pour garder le nombre de modules mobiles contenu.
 */
import apiClient from './client';

// ============ LIVE COMMERCE ============
export interface LivePinnedProduct {
  id: string;
  live_stream_id: string;
  product_id: string;
  order_index: number;
  is_flash_deal: boolean;
  flash_price?: number | null;
  flash_ends_at?: string | null;
  clicks_count: number;
  product?: {
    id: string; name: string; price: number; currency?: string;
    images?: { url: string }[]; cover_image_url?: string | null;
  };
}

export const liveCommerceApi = {
  async listPinned(liveId: string): Promise<LivePinnedProduct[]> {
    const { data } = await apiClient.get(`/live-commerce/${encodeURIComponent(liveId)}/products`);
    return data?.data ?? [];
  },
  async pin(liveId: string, payload: {
    product_id: string; order_index?: number;
    is_flash_deal?: boolean; flash_price?: number; flash_ends_at?: string;
  }): Promise<LivePinnedProduct> {
    const { data } = await apiClient.post(`/live-commerce/${encodeURIComponent(liveId)}/pin`, payload);
    return data?.data;
  },
  async unpin(liveId: string, productId: string): Promise<void> {
    await apiClient.delete(`/live-commerce/${encodeURIComponent(liveId)}/pin/${encodeURIComponent(productId)}`);
  },
  async click(liveId: string, productId: string): Promise<void> {
    await apiClient.post(`/live-commerce/${encodeURIComponent(liveId)}/pin/${encodeURIComponent(productId)}/click`);
  },
};

// ============ UTILITY BILLS (EDM, Somagep, Canal+, Orange TV, Malitel...) ============
export interface UtilityBillField {
  name: string; label: string; type: string; required?: boolean;
}
export interface UtilityBillProvider {
  id: string; slug: string; name: string;
  category: string; logo_url?: string | null; country: string;
  fields_schema: { fields: UtilityBillField[] };
}
export interface UtilityBillPayment {
  id: string; provider_id: string; account_ref: string;
  amount_fcfa: number; status: string; payment_method?: string | null;
  reference: string; receipt_url?: string | null; created_at: string;
  provider?: UtilityBillProvider;
}

export const utilityBillsApi = {
  async listProviders(category?: string): Promise<UtilityBillProvider[]> {
    const { data } = await apiClient.get('/utility-bills/providers', { params: { category } });
    return data?.data ?? [];
  },
  async pay(payload: {
    provider_id: string; account_ref: string; amount_fcfa: number;
    payment_method: 'wallet' | 'orange_money' | 'wave' | 'mtn_money' | 'moov_money';
    metadata?: Record<string, unknown>;
  }): Promise<UtilityBillPayment> {
    const { data } = await apiClient.post('/utility-bills/payments', payload);
    return data?.data;
  },
  async myPayments(): Promise<UtilityBillPayment[]> {
    const { data } = await apiClient.get('/utility-bills/payments');
    return data?.data ?? [];
  },
};

// ============ SAVINGS PLANS ============
export type SavingsFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export interface SavingsPlan {
  id: string; name: string;
  contribution_amount: number;
  frequency: SavingsFrequency;
  next_debit_at: string;
  currency: string;
  balance: number;
  status: 'active' | 'paused' | 'closed';
  target_amount?: number | null;
  target_date?: string | null;
  created_at: string;
  transactions?: { id: string; amount: number; kind: string; created_at: string }[];
}

export const savingsApi = {
  async listMine(): Promise<SavingsPlan[]> {
    const { data } = await apiClient.get('/savings');
    return data?.data ?? [];
  },
  async create(payload: {
    name: string; contribution_amount: number; frequency: SavingsFrequency;
    target_amount?: number; target_date?: string;
  }): Promise<SavingsPlan> {
    const { data } = await apiClient.post('/savings', payload);
    return data?.data;
  },
  async pause(id: string): Promise<void> { await apiClient.post(`/savings/${id}/pause`); },
  async resume(id: string): Promise<void> { await apiClient.post(`/savings/${id}/resume`); },
  async withdraw(id: string, amount: number): Promise<void> {
    await apiClient.post(`/savings/${id}/withdraw`, { amount });
  },
  async close(id: string): Promise<void> { await apiClient.post(`/savings/${id}/close`); },
};

// ============ VIRTUAL CARDS ============
export interface VirtualCard {
  id: string; last4: string; brand: string;
  status: 'active' | 'blocked' | 'expired';
  expires_at: string;
  spending_limit?: number | null;
  created_at: string;
}

export const virtualCardsApi = {
  async listMine(): Promise<VirtualCard[]> {
    const { data } = await apiClient.get('/virtual-cards');
    return data?.data ?? [];
  },
  async create(spendingLimit?: number): Promise<VirtualCard> {
    const { data } = await apiClient.post('/virtual-cards', { spending_limit: spendingLimit });
    return data?.data;
  },
  async toggleBlock(id: string): Promise<VirtualCard> {
    const { data } = await apiClient.post(`/virtual-cards/${id}/block`);
    return data?.data;
  },
  async setLimit(id: string, spendingLimit: number | null): Promise<VirtualCard> {
    const { data } = await apiClient.patch(`/virtual-cards/${id}/limit`, { spending_limit: spendingLimit });
    return data?.data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/virtual-cards/${id}`);
  },
};

export default { liveCommerceApi, utilityBillsApi, savingsApi, virtualCardsApi };
