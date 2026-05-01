import mobileApiClient from './mobileClient';
import { User } from '../store/authStore';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
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
    login_alerts_enabled:
      typeof backendUser.login_alerts_enabled === 'boolean' ? backendUser.login_alerts_enabled : undefined,
  };
}

// Unwrap backend response: { success: true, data: { ... } }
function unwrapResponse(responseData: any): any {
  if (responseData?.success && responseData?.data) {
    return responseData.data;
  }
  return responseData;
}

/**
 * Compatibilité backend:
 * - priorité: `/api/proxy/auth/*` (contrat Expo historique)
 * - fallback: `/api/auth/*` quand l'environnement courant n'expose pas `/proxy` (404)
 */
async function withAuthProxyFallback<T>(
  callProxy: () => Promise<T>,
  callDirect: () => Promise<T>,
): Promise<T> {
  try {
    return await callProxy();
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return callDirect();
    }
    throw error;
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/login', {
        identifier: data.identifier,
        password: data.password,
      }),
      () => mobileApiClient.post('/auth/login', {
        identifier: data.identifier,
        password: data.password,
      }),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const payload = {
      username: data.username,
      password: data.password,
      email: data.email || undefined,
      phone: data.phone || undefined,
      full_name: data.full_name || undefined,
      referral_code: data.referral_code || undefined,
    };
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/register', payload),
      () => mobileApiClient.post('/auth/register', payload),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  logout: async (refreshToken?: string): Promise<void> => {
    try {
      const payload = { refreshToken: refreshToken || undefined };
      await withAuthProxyFallback(
        () => mobileApiClient.post('/proxy/auth/logout', payload),
        () => mobileApiClient.post('/auth/logout', payload),
      );
    } catch {
      // Logout can fail silently - token will expire anyway
    }
  },

  getMe: async (): Promise<User> => {
    const response = await withAuthProxyFallback(
      () => mobileApiClient.get('/proxy/auth/me'),
      () => mobileApiClient.get('/auth/me'),
    );
    const result = unwrapResponse(response.data);
    return normalizeUser(result);
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const payload = { refreshToken };
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/refresh', payload),
      () => mobileApiClient.post('/auth/refresh', payload),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    const payload = { identifier: data.identifier };
    await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/forgot-password', payload),
      () => mobileApiClient.post('/auth/forgot-password', payload),
    );
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const payload = { token, newPassword };
    await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/password/reset', payload),
      () => mobileApiClient.post('/auth/password/reset', payload),
    );
  },

  oauthGoogle: async (accessToken: string): Promise<AuthResponse> => {
    const payload = { accessToken: accessToken.trim() };
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/oauth/google', payload),
      () => mobileApiClient.post('/auth/oauth/google', payload),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  oauthFacebook: async (accessToken: string): Promise<AuthResponse> => {
    const payload = { accessToken: accessToken.trim() };
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/oauth/facebook', payload),
      () => mobileApiClient.post('/auth/oauth/facebook', payload),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  oauthApple: async (payload: {
    identityToken: string;
    user?: { email?: string; name?: { firstName?: string; lastName?: string } };
  }): Promise<AuthResponse> => {
    const body = {
      identityToken: payload.identityToken.trim(),
      user: payload.user,
    };
    const response = await withAuthProxyFallback(
      () => mobileApiClient.post('/proxy/auth/oauth/apple', body),
      () => mobileApiClient.post('/auth/oauth/apple', body),
    );
    const result = unwrapResponse(response.data);
    return {
      user: normalizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },
};
