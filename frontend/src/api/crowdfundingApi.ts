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
  rewards?: {
    id: string;
    title?: string;
    description?: string;
    amount: number;
    quantity?: number;
    delivery_date?: string;
  }[];
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
  /** Présent quand le serveur renvoie la contribution à plat dans `data`. */
  id?: string;
}

export interface CrowdfundingContributionRow {
  id: string;
  amount: number;
  reward_tier?: string | null;
  created_at: string;
  contributor: {
    id: string;
    display_name: string;
    avatar?: string | null;
  };
}

export interface CrowdfundingContributionsResponse {
  contributions: CrowdfundingContributionRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CrowdfundingRecentContributorRow extends CrowdfundingContributionRow {
  campaign_id: string;
  project_title: string;
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmount: number;
  endDate: string;
  category?: string;
  coverImage?: string;
  rewards?: Record<string, unknown>[];
}

export interface MyContributionRow {
  id: string;
  amount: number;
  status: string;
  reward_tier?: string | null;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    current_amount: number;
    goal_amount: number;
    end_date: string;
    status: string;
    category?: string | null;
    cover_image?: string | null;
  } | null;
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
    category?: string;
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

  async create(input: CreateCampaignInput): Promise<CrowdfundingProject & { id: string }> {
    const res = await apiClient.post('/crowdfunding', input);
    return unwrap<CrowdfundingProject & { id: string }>(res.data);
  },

  async getMyCampaigns(): Promise<CrowdfundingProject[]> {
    const res = await apiClient.get('/crowdfunding/me/campaigns');
    const data = unwrap<{ campaigns: CrowdfundingProject[] } | CrowdfundingProject[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.campaigns ?? [];
  },

  async getMyContributions(): Promise<MyContributionRow[]> {
    const res = await apiClient.get('/crowdfunding/me/contributions');
    const data = unwrap<{ contributions: MyContributionRow[] }>(res.data);
    return data?.contributions ?? [];
  },

  async report(campaignId: string): Promise<{ reported: boolean; report_count: number }> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/report`, {});
    return unwrap<{ reported: boolean; report_count: number }>(res.data);
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
    const data = unwrap<ContributeResponse & Record<string, unknown>>(res.data);
    const flat = data as Record<string, unknown> | undefined;
    const contribution = (flat?.contribution ?? flat) as Record<string, unknown>;
    return {
      contribution,
      paymentUrl: flat?.paymentUrl as string | undefined,
      transactionId: flat?.transactionId as string | undefined,
      reference: flat?.reference as string | undefined,
      id: (typeof flat?.id === 'string' ? flat.id : undefined) ?? (typeof contribution?.id === 'string' ? (contribution.id as string) : undefined),
    };
  },

  /** Soutiens confirmés pour une campagne (liste publique). */
  async listContributions(
    campaignId: string,
    params?: { page?: number; limit?: number },
  ): Promise<CrowdfundingContributionsResponse> {
    const res = await apiClient.get(`/crowdfunding/${encodeURIComponent(campaignId)}/contributions`, {
      params: { page: params?.page, limit: params?.limit },
    });
    return unwrap<CrowdfundingContributionsResponse>(res.data);
  },

  /** Derniers soutiens sur toutes les campagnes du créateur connecté. */
  async myRecentContributors(limit?: number): Promise<{ contributors: CrowdfundingRecentContributorRow[] }> {
    const res = await apiClient.get('/crowdfunding/me/recent-contributors', {
      params: limit != null ? { limit } : undefined,
    });
    return unwrap<{ contributors: CrowdfundingRecentContributorRow[] }>(res.data);
  },

  /** Après paiement Orange Money — crédite l’escrow (idempotent si déjà confirmé). */
  async confirmContribution(contributionId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post(
      `/crowdfunding/contributions/${encodeURIComponent(contributionId)}/confirm`,
      {},
    );
    return unwrap<Record<string, unknown>>(res.data);
  },

  async releaseMilestone(campaignId: string, milestoneIndex: number): Promise<Record<string, unknown>> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/release-milestone`, {
      milestoneIndex,
    });
    return unwrap<Record<string, unknown>>(res.data);
  },

  async releaseEscrow(campaignId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/release-escrow`, {});
    return unwrap<Record<string, unknown>>(res.data);
  },

  async refundIfFailed(campaignId: string): Promise<{ refunded: boolean; count?: number }> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/refund-if-failed`, {});
    return unwrap<{ refunded: boolean; count?: number }>(res.data);
  },

  /** Modération — comptes admin uniquement. */
  async suspendCampaign(campaignId: string, input?: { reason?: string; fraudFlag?: boolean }): Promise<Record<string, unknown>> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/suspend`, input ?? {});
    return unwrap<Record<string, unknown>>(res.data);
  },

  async approveCampaign(campaignId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/approve`, {});
    return unwrap<Record<string, unknown>>(res.data);
  },
  async rejectCampaign(campaignId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/reject`, {});
    return unwrap<Record<string, unknown>>(res.data);
  },

  async listUpdates(campaignId: string): Promise<
    { id: string; title: string; content: string; image_url: string | null; created_at: string }[]
  > {
    const res = await apiClient.get(`/crowdfunding/${encodeURIComponent(campaignId)}/updates`);
    const data = unwrap<{ updates: { id: string; title: string; content: string; image_url: string | null; created_at: string }[] }>(res.data);
    return data?.updates ?? [];
  },
  async postUpdate(campaignId: string, body: { title: string; content: string; imageUrl?: string }): Promise<unknown> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/updates`, body);
    return unwrap(res.data);
  },

  async listMessages(
    campaignId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{
    comments: { id: string; content: string; created_at: string; user: { id: string; display_name: string; avatar?: string | null } }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await apiClient.get(`/crowdfunding/${encodeURIComponent(campaignId)}/messages`, { params });
    return unwrap(res.data);
  },
  async postMessage(campaignId: string, content: string, parentId?: string): Promise<unknown> {
    const res = await apiClient.post(`/crowdfunding/${encodeURIComponent(campaignId)}/messages`, {
      content,
      parentId: parentId ?? null,
    });
    return unwrap(res.data);
  },

  async getPortfolio(): Promise<{
    totalInvested: number;
    byCategory: Record<string, number>;
    byCampaignStatus: Record<string, number>;
    counts: { rows: number; activeCampaigns: number; fundedCampaigns: number };
    contributions: MyContributionRow[];
  }> {
    const res = await apiClient.get('/crowdfunding/me/portfolio');
    return unwrap<{
      totalInvested: number;
      byCategory: Record<string, number>;
      byCampaignStatus: Record<string, number>;
      counts: { rows: number; activeCampaigns: number; fundedCampaigns: number };
      contributions: MyContributionRow[];
    }>(res.data);
  },
};

export default crowdfundingApi;
