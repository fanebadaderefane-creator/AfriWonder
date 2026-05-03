import { mobileApiClient } from './mobileClient';

export type MicrocreditLoanRow = {
  id: string;
  amount_requested: number;
  current_amount: number;
  purpose: string;
  repayment_period_months: number;
  interest_rate: number;
  status: string;
  credit_score?: number | null;
  risk_level?: string | null;
  created_at?: string;
  business_plan?: string | null;
  borrower_name?: string;
  borrower_avatar?: string;
  lenders_count?: number;
};

function loansFromBody(resData: unknown): MicrocreditLoanRow[] {
  const wrap = resData as { data?: { loans?: MicrocreditLoanRow[] } };
  const list = wrap?.data?.loans;
  return Array.isArray(list) ? list : [];
}

export const microcreditApi = {
  async listPublic(params?: { page?: number; limit?: number; status?: string }): Promise<MicrocreditLoanRow[]> {
    const res = await mobileApiClient.get('/microcredit', { params });
    return loansFromBody(res.data);
  },

  async myLoans(): Promise<MicrocreditLoanRow[]> {
    const res = await mobileApiClient.get('/microcredit/me/loans');
    return loansFromBody(res.data);
  },

  async createRequest(input: {
    amount: number;
    purpose: string;
    repaymentPeriod: number;
    interestRate: number;
    business_plan?: string;
  }) {
    const res = await mobileApiClient.post('/microcredit/request', input);
    return (res.data as { data?: unknown })?.data;
  },
};

export default microcreditApi;
