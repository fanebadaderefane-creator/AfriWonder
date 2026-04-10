import apiClient from './client';
import { User } from '../store/authStore';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  full_name?: string;
  referral_code?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Transform backend user response to match our frontend User model
function normalizeUser(backendUser: any): User {
  const nameParts = (backendUser.full_name || '').split(' ');
  return {
    id: backendUser.id,
    email: backendUser.email || '',
    username: backendUser.username || '',
    full_name: backendUser.full_name || '',
    profile_image: backendUser.profile_image || '',
    role: backendUser.role || 'user',
    phone: backendUser.phone || '',
    bio: backendUser.bio || '',
    country: backendUser.country || '',
    followers: backendUser.followers_count || backendUser.followers || 0,
    following: backendUser.following_count || backendUser.following || 0,
    videosCount: backendUser.videos_count || backendUser.videosCount || 0,
    createdAt: backendUser.created_at || backendUser.createdAt || '',
    // Backward compat fields
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    avatar: backendUser.profile_image || '',
  };
}

// Unwrap backend response: { success: true, data: { ... } }
function unwrapResponse(responseData: any): any {
  if (responseData?.success && responseData?.data) {
    return responseData.data;
  }
  return responseData;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', {
      identifier: data.identifier,
      password: data.password,
    });
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      username: data.username,
      password: data.password,
      email: data.email || undefined,
      phone: data.phone || undefined,
      full_name: data.full_name || undefined,
      referral_code: data.referral_code || undefined,
    });
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await apiClient.post('/auth/logout', {
      refreshToken: refreshToken || undefined,
    });
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    const result = unwrapResponse(response.data);
    return normalizeUser(result);
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },
};
