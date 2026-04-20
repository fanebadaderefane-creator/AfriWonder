import apiClient from './client';

/**
 * Client REST pour `/api/news` (backend `news.routes.ts`).
 * Pas d'endpoint `/categories` — on filtre via le query param `category`.
 */

export interface NewsArticle {
  id: string;
  slug?: string;
  title: string;
  summary?: string;
  content?: string;
  image_url?: string;
  cover_image?: string;
  category?: string;
  country?: string;
  language?: string;
  source_name?: string;
  source_url?: string;
  is_published?: boolean;
  is_breaking?: boolean;
  is_featured?: boolean;
  is_sponsored?: boolean;
  published_at?: string;
  created_at?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  author?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar?: string;
  };
}

export interface NewsListResponse {
  articles?: NewsArticle[];
  items?: NewsArticle[];
  pagination?: { page: number; limit: number; total: number; totalPages?: number };
}

export interface NewsDetailResponse {
  article: NewsArticle;
  likeStatus?: { liked: boolean };
}

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export const newsApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    category?: string;
    country?: string;
    language?: string;
    search?: string;
    isBreaking?: boolean;
    isFeatured?: boolean;
  }): Promise<NewsArticle[]> {
    const res = await apiClient.get('/news', { params });
    const data = unwrap<NewsListResponse | NewsArticle[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.articles ?? data?.items ?? [];
  },

  async breaking(): Promise<NewsArticle[]> {
    const res = await apiClient.get('/news/breaking');
    const data = unwrap<NewsListResponse | NewsArticle[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.articles ?? data?.items ?? [];
  },

  async trending(limit: number = 10): Promise<NewsArticle[]> {
    const res = await apiClient.get('/news/trending', { params: { limit } });
    const data = unwrap<NewsListResponse | NewsArticle[]>(res.data);
    if (Array.isArray(data)) return data;
    return data?.articles ?? data?.items ?? [];
  },

  async get(idOrSlug: string): Promise<NewsArticle> {
    const res = await apiClient.get(`/news/${encodeURIComponent(idOrSlug)}`);
    const data = unwrap<NewsDetailResponse | NewsArticle>(res.data);
    if (data && typeof data === 'object' && 'article' in data) {
      return (data as NewsDetailResponse).article;
    }
    return data as NewsArticle;
  },

  async like(id: string): Promise<{ liked?: boolean }> {
    const res = await apiClient.post(`/news/${encodeURIComponent(id)}/like`, {});
    return unwrap<{ liked?: boolean }>(res.data);
  },
};

export default newsApi;
