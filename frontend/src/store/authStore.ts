import { create } from 'zustand';
import { secureStorage } from '../utils/secureStorage';

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  profile_image?: string;
  role?: string;
  phone?: string;
  bio?: string;
  website?: string | null;
  location?: string | null;
  is_verified?: boolean;
  /** Profil enrichi (GET /auth/me) — optionnel côté client. */
  replay_premium?: boolean;
  monetization_enabled?: boolean;
  account_suspended?: boolean;
  country?: string;
  followers?: number;
  following?: number;
  videosCount?: number;
  createdAt?: string;
  // Computed convenience getters
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, accessToken, refreshToken) => {
    try {
      await secureStorage.setItem('accessToken', accessToken);
      await secureStorage.setItem('refreshToken', refreshToken);
      await secureStorage.setItem('user', JSON.stringify(user));
      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Error storing auth:', error);
    }
  },

  logout: async () => {
    try {
      await secureStorage.deleteItem('accessToken');
      await secureStorage.deleteItem('refreshToken');
      await secureStorage.deleteItem('user');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  },

  loadStoredAuth: async () => {
    try {
      const accessToken = await secureStorage.getItem('accessToken');
      const refreshToken = await secureStorage.getItem('refreshToken');
      const userStr = await secureStorage.getItem('user');
      
      if (accessToken && refreshToken && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ isLoading: false });
    }
  },

  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },
}));
