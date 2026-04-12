import { mobileApiClient } from './mobileClient';

export type InsuranceProviderPublic = {
  id: string;
  company_name: string;
  description?: string | null;
  types_offered?: unknown;
  city?: string | null;
};

export type InsurancePolicyRow = {
  id: string;
  policy_type: string;
  provider: string;
  plan_name?: string | null;
  premium_amount: number;
  payment_frequency?: string;
  status: string;
  next_payment_date?: string | null;
  currency?: string;
};

export async function fetchInsuranceProviders(): Promise<InsuranceProviderPublic[]> {
  const { data } = await mobileApiClient.get<{ success?: boolean; data?: InsuranceProviderPublic[] }>(
    '/insurance/providers'
  );
  return Array.isArray(data?.data) ? data.data : [];
}

export async function fetchMyInsurancePolicies(): Promise<InsurancePolicyRow[]> {
  const { data } = await mobileApiClient.get<{ success?: boolean; data?: InsurancePolicyRow[] }>('/insurance/policies');
  return Array.isArray(data?.data) ? data.data : [];
}

export type SubscribePolicyPayload = {
  policy_type: string;
  provider: string;
  plan_name?: string;
  premium_amount: number;
  payment_frequency?: 'monthly' | 'quarterly' | 'yearly';
};

export async function subscribeInsurancePolicy(payload: SubscribePolicyPayload): Promise<InsurancePolicyRow> {
  const { data } = await mobileApiClient.post<{ success?: boolean; data: InsurancePolicyRow }>(
    '/insurance/policies',
    payload
  );
  return data.data;
}

export type QuoteRequestPayload = {
  full_name: string;
  phone: string;
  additional_info?: string;
  offer_key: string;
  offer_name: string;
  price_display?: string;
};

export async function createInsuranceQuoteRequest(payload: QuoteRequestPayload): Promise<unknown> {
  const { data } = await mobileApiClient.post('/insurance/quote-requests', payload);
  return data?.data;
}

export type CreateClaimPayload = {
  policy_id: string;
  incident_date: string;
  description: string;
  claim_amount: number;
};

export async function createInsuranceClaim(payload: CreateClaimPayload): Promise<unknown> {
  const { data } = await mobileApiClient.post('/insurance/claims', payload);
  return data?.data;
}
