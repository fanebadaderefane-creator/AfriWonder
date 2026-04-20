import apiClient from './client';

/**
 * Client REST pour `/api/crowdfunding` (backend `crowdfunding.routes.ts`).
 *
 * Note paiement : `POST /:id/contribute` ne crée pas seulement la contribution,
 * il déclenche aussi le paiement Orange Money côté serveur et renvoie
 * `{ paymentUrl, transactionId, ... }`. Le client doit ouvrir `paymentUrl`
 * dans un navigateur intégré pour finaliser.
 */

export interface CrowdfundingProject {
  id: string;
  title: string;
  description?: string;
  goal_amount?: number;
  goalAmount?: number;
  raised_amount?: number;
  raisedAmount?: number;
  end_date?: string;
  endDate?: string;
  status?: string;
  images?: string[];
  cover_image?: string;
  category?: string;
  rewards?: Array<{
    id: string;
    title?: string;
    description?: string;
    amount: number;
    quantity?: number;
    delivery_date?: string;
  }>;
  creator?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar?: string;
  };
}

export interface CrowdfundingListResponse {
  projects?: CrowdfundingProject[];
  campaigns?: CrowdfundingProject[];
  pagination?: { page: number; limit: number; total: number; totalPages?: number };
}

export interface ContributeInput {
  amount: number;
  phone: string;
  rewardTier?: string | null;
}

export interface ContributeResponse {
  contribution: Record<string, unknown>;
  paymentUrl?: string;
  transactionId?: string;
  reference?: string;
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const crowdfundingApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<CrowdfundingProject[]> {
    const res = await apiClient.get('/crowdfunding', { params });
    const data = unwrap<CrowdfundingListResponse | CrowdfundingProject[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.projects ?? data?.campaigns ?? [];
  },

  async get(id: string): Promise<CrowdfundingProject> {
    const res = await apiClient.get(`/crowdfunding/${encodeURIComponent(id)}`);
    return unwrap<CrowdfundingProject>(res.data);
  },

  /**
   * Démarre une contribution + génère l'URL de paiement Orange Money.
   * @param id  Identifiant du projet/campaign.
   * @param input.amount  Montant en FCFA (XOF).
   * @param input.phone  Numéro Orange Money (avec indicatif).
   * @param input.rewardTier  Optionnel : id du palier de récompense.
   */
  async contribute(id: string, input: ContributeInput): Promise<ContributeResponse> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(id)}/contribute`, input);
    const data = unwrap<ContributeResponse>(res.data);
    return {
      contribution: (data?.contribution ?? data) as Record<string, unknown>,
      paymentUrl: data?.paymentUrl,
      transactionId: data?.transactionId,
      reference: data?.reference,
    };
  },
};

export default crowdfundingApi;
