import apiClient from './client';

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    isFollowing: boolean;
  };
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  likes: number;
  isLiked: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  createdAt: string;
}

export interface FeedResponse {
  videos: Video[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export const videosApi = {
  getFeed: async (page: number = 1, limit: number = 10): Promise<FeedResponse> => {
    const response = await apiClient.get(`/videos/feed?page=${page}&limit=${limit}`);
    return response.data;
  },

  getVideo: async (id: string): Promise<Video> => {
    const response = await apiClient.get(`/videos/${id}`);
    return response.data;
  },

  likeVideo: async (id: string): Promise<{ liked: boolean; likes: number }> => {
    const response = await apiClient.post(`/videos/${id}/like`);
    return response.data;
  },

  saveVideo: async (id: string): Promise<{ saved: boolean }> => {
    const response = await apiClient.post(`/videos/${id}/save`);
    return response.data;
  },

  getComments: async (videoId: string, page: number = 1): Promise<{ comments: Comment[]; hasMore: boolean }> => {
    const response = await apiClient.get(`/videos/${videoId}/comments?page=${page}`);
    return response.data;
  },

  addComment: async (videoId: string, text: string): Promise<Comment> => {
    const response = await apiClient.post(`/videos/${videoId}/comment`, { text });
    return response.data;
  },

  uploadVideo: async (formData: FormData): Promise<Video> => {
    const response = await apiClient.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTrending: async (): Promise<{ hashtags: string[]; videos: Video[] }> => {
    const response = await apiClient.get('/videos/trending');
    return response.data;
  },

  search: async (query: string, type: 'videos' | 'users' | 'products' = 'videos'): Promise<any> => {
    const response = await apiClient.get(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    return response.data;
  },
};
