import apiClient from './client';

/** Client REST pour `/api/jobs` (backend `jobs.routes.ts`). */

export interface Job {
  id: string;
  title: string;
  company?: string;
  description?: string;
  location?: string;
  city?: string;
  country?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  type?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | string;
  remote?: boolean;
  experience_required?: string;
  education_required?: string;
  skills?: string[];
  posted_at?: string;
  created_at?: string;
  application_deadline?: string;
  is_active?: boolean;
  poster?: { id: string; username?: string; display_name?: string; logo?: string };
}

export interface JobListResponse {
  jobs?: Job[];
  items?: Job[];
  pagination?: { page: number; limit: number; total: number };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const jobsApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    type?: string;
    remote?: boolean;
  }): Promise<Job[]> {
    const res = await apiClient.get('/jobs', { params });
    const data = unwrap<JobListResponse | Job[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.jobs ?? data?.items ?? [];
  },

  async get(id: string): Promise<Job> {
    const res = await apiClient.get(`/jobs/${encodeURIComponent(id)}`);
    return unwrap<Job>(res.data);
  },

  async recommended(limit: number = 10): Promise<Job[]> {
    const res = await apiClient.get('/jobs/recommended', { params: { limit } });
    const data = unwrap<JobListResponse | Job[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.jobs ?? data?.items ?? [];
  },
};

export default jobsApi;
