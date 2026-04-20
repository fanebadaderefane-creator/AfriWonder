import apiClient from './client';

/**
 * Client REST pour `/api/courses` (backend `courses.routes.ts`).
 */

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  trailerUrl?: string;
  trailer_url?: string;
  price: number;
  currency?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | string;
  duration_hours?: number;
  language?: string;
  certificate_enabled?: boolean;
  is_published?: boolean;
  rating?: number;
  total_students?: number;
  instructor?: {
    id: string;
    full_name?: string;
    avatar?: string;
    bio?: string;
  };
  created_at?: string;
}

export interface CourseListResponse {
  courses?: Course[];
  items?: Course[];
  pagination?: { page: number; limit: number; total: number; totalPages?: number };
}

export interface EnrollResponse {
  enrollment?: Record<string, unknown>;
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

export const coursesApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    category?: string;
    level?: string;
    search?: string;
    sort?: string;
    price?: 'free' | 'paid';
  }): Promise<Course[]> {
    const res = await apiClient.get('/courses', { params });
    const data = unwrap<CourseListResponse | Course[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.courses ?? data?.items ?? [];
  },

  async get(id: string): Promise<Course> {
    const res = await apiClient.get(`/courses/${encodeURIComponent(id)}`);
    return unwrap<Course>(res.data);
  },

  async recommendations(limit: number = 10): Promise<Course[]> {
    const res = await apiClient.get('/courses/recommendations', { params: { limit } });
    const data = unwrap<CourseListResponse | Course[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.courses ?? data?.items ?? [];
  },

  /** POST /courses/:id/enroll — paiement Orange Money si payant. */
  async enroll(id: string, phone?: string): Promise<EnrollResponse> {
    const res = await apiClient.post(`/courses/${encodeURIComponent(id)}/enroll`, { phone });
    return unwrap<EnrollResponse>(res.data);
  },
};

export default coursesApi;
