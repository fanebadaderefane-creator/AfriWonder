/**
 * Session utilisateur — source de vérité **persistée** : `secureStorage`
 * (SecureStore iOS/Android, AsyncStorage sur Web). `loadStoredAuth` est appelé au boot (`_layout`)
 * et au retour au premier plan (AppState) pour rester synchronisé avec le stockage.
 * Les rafraîchissements de jetons (`apiClient` / `mobileClient`) mettent à jour disque + ce store.
 */
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
  data_saver_mode?: boolean;
  preferred_language?: string | null;
  timezone?: string | null;
  theme?: string | null;
  preferred_categories?: string[] | null;
  messaging_e2e_enabled?: boolean;
  messaging_read_receipts_enabled?: boolean;
  messaging_cdc_moderation?: Record<string, unknown> | null;
  /** Alertes e-mail lors d’une connexion depuis un nouvel appareil / navigateur (serveur). */
  login_alerts_enabled?: boolean;
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
      void import('../services/notificationService')
        .then((m) => m.default.syncPushTokenWithBackend())
        .catch(() => {});
    } catch (error) {
      console.error('Error storing auth:', error);
    }
  },

  logout: async () => {
    try {
      try {
        const [{ notificationService }, { default: mobileApiClient }] = await Promise.all([
          import('../services/notificationService'),
          import('../api/mobileClient'),
        ]);
        const token = notificationService.token;
        if (token) {
          await mobileApiClient.delete(`/mobile/push-token/${encodeURIComponent(token)}`);
        }
      } catch {
        /* logout should not fail on push unregister */
      }
      const prevUserId = get().user?.id;
      await secureStorage.deleteItem('accessToken');
      await secureStorage.deleteItem('refreshToken');
      await secureStorage.deleteItem('user');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
      void import('../messages/inboxConversationsCache')
        .then((m) => m.clearInboxConversationsCache(prevUserId))
        .catch(() => {});
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
      const nextUser = { ...user, ...updates };
      void secureStorage.setItem('user', JSON.stringify(nextUser)).catch(() => {});
      set({ user: nextUser });
    }
  },
}));
