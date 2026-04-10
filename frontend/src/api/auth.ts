import apiClient from './client';
import mobileApiClient from './mobileClient';
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
    // Route auth via local proxy to bypass anti-bot detection on PWA backend
    const response = await mobileApiClient.post('/proxy/auth/login', {
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
    // Route auth via local proxy to bypass anti-bot detection on PWA backend
    const response = await mobileApiClient.post('/proxy/auth/register', {
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
    try {
      await mobileApiClient.post('/proxy/auth/logout', {
        refreshToken: refreshToken || undefined,
      });
    } catch (e) {
      // Logout can fail silently - token will expire anyway
    }
  },

  getMe: async (): Promise<User> => {
    // getMe needs auth header - use proxy to bypass anti-bot
    const response = await mobileApiClient.get('/proxy/auth/me');
    const result = unwrapResponse(response.data);
    return normalizeUser(result);
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await mobileApiClient.post('/proxy/auth/refresh', { refreshToken });
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },
};
