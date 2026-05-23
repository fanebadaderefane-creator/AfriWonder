import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from '../utils/secureStorage';
import { getBackendOrigin } from '../config/backendBase';
import { useAuthStore } from '../store/authStore';
import { attachUserFacingApiError } from '../utils/userFacingError';
import { devLog } from '../utils/devLog';
import { getAfriDeviceIdForRequestHeader, withAfriDeviceTrustHeaders } from '../utils/afwDeviceRequestId';

// Routes `/api/*` directes sur l’origine backend (Express, ex. port 3000 en dev).
const getMobileApiBaseUrl = () => getBackendOrigin();

const mobileApiClient = axios.create({
  baseURL: `${getMobileApiBaseUrl()}/api`,
  /** Aligné sur `apiClient` — 3G Mali / requêtes lourdes. */
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

mobileApiClient.interceptors.request.use((config) => {
  config.baseURL = `${getMobileApiBaseUrl()}/api`;
  return config;
});

/** Une seule course de refresh si plusieurs requêtes reçoivent 401 en parallèle. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const fromStore = useAuthStore.getState().refreshToken;
      const refreshToken = (await secureStorage.getItem('refreshToken')) || fromStore || null;
      if (!refreshToken?.trim()) return null;

      const origin = getMobileApiBaseUrl();
      const res = await axios.post(
        `${origin}/api/proxy/auth/refresh`,
        { refreshToken: refreshToken.trim() },
        {
          headers: withAfriDeviceTrustHeaders({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
          timeout: 15000,
        }
      );
      const data = (res.data?.data ?? res.data) as { accessToken?: string; refreshToken?: string };
      const accessToken = typeof data?.accessToken === 'string' ? data.accessToken.trim() : '';
      const newRefresh = typeof data?.refreshToken === 'string' ? data.refreshToken.trim() : '';
      if (!accessToken) return null;

      await secureStorage.setItem('accessToken', accessToken);
      if (newRefresh) {
        await secureStorage.setItem('refreshToken', newRefresh);
      }
      useAuthStore.setState({
        accessToken,
        refreshToken: newRefresh || refreshToken.trim(),
      });
      return accessToken;
    } catch {
      await secureStorage.deleteItem('accessToken');
      await secureStorage.deleteItem('refreshToken');
      await secureStorage.deleteItem('user');
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function isAuthProxyPath(config: AxiosRequestConfig): boolean {
  const u = String(config.url || '');
  return (
    u.includes('/proxy/auth/login')
    || u.includes('/proxy/auth/register')
    || u.includes('/proxy/auth/refresh')
    || u.includes('/proxy/auth/logout')
    || u.includes('/proxy/auth/forgot-password')
    || u.includes('/proxy/auth/oauth/')
    || u.includes('/proxy/auth/password')
    || u.includes('/proxy/auth/supabase')
    /** Fallback sans segment `proxy` (`authApi.withAuthProxyFallback`) : baseURL `/api`. */
    || u.includes('/auth/login')
    || u.includes('/auth/register')
    || u.includes('/auth/logout')
    || u.includes('/auth/refresh')
    || u.includes('/auth/forgot-password')
    || u.includes('/auth/oauth/')
    || u.includes('/auth/password')
    || u.includes('/auth/supabase')
  );
}

// Add auth token interceptor
mobileApiClient.interceptors.request.use(
  async (config) => {
    try {
      const fromStore = useAuthStore.getState().accessToken;
      const raw = (await secureStorage.getItem('accessToken')) || fromStore || '';
      const token = typeof raw === 'string' ? raw.trim() : '';
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      devLog('Error getting token for mobile API:', error);
    }
    /** Toujours présent — le backend exempte les faux positifs CSRF (cookies + Origin) pour les apps natives. */
    try {
      if (config.headers) {
        (config.headers as Record<string, string>)['X-AFW-Device-Id'] = getAfriDeviceIdForRequestHeader();
      }
    } catch {
      /* ignore */
    }
    return config;
  },
  (error) => Promise.reject(error)
);

mobileApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const rejectWithUserMessage = (err: unknown) => {
      attachUserFacingApiError(err);
      return Promise.reject(err);
    };

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest || originalRequest._retry) {
      return rejectWithUserMessage(error);
    }
    if (error.response?.status !== 401) {
      return rejectWithUserMessage(error);
    }
    if (isAuthProxyPath(originalRequest)) {
      return rejectWithUserMessage(error);
    }

    originalRequest._retry = true;
    const newAccess = await refreshAccessToken();
    if (!newAccess) {
      return rejectWithUserMessage(error);
    }
    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
    return mobileApiClient(originalRequest);
  }
);

export { mobileApiClient };
export default mobileApiClient;
