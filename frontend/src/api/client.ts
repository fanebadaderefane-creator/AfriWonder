import axios from 'axios';
import Constants from 'expo-constants';
import { secureStorage } from '../utils/secureStorage';
import { getBackendOrigin } from '../config/backendBase';
import { useAuthStore } from '../store/authStore';

// Même route que la PWA : `/api/proxy` sur l’origine backend (Express, port 3000 en dev).
const getProxyBaseUrl = () => getBackendOrigin();

/** Axios applique par défaut `application/json` : il faut le retirer pour `FormData` (boundary multipart). */
function clearContentTypeForFormData(config: { data?: unknown; headers?: any }) {
  if (!(config.data instanceof FormData) || !config.headers) return;
  const h = config.headers;
  if (typeof h.delete === 'function') {
    h.delete('Content-Type');
    h.delete('content-type');
  } else {
    delete h['Content-Type'];
    delete h['content-type'];
  }
}

const apiClient = axios.create({
  baseURL: `${getProxyBaseUrl()}/api/proxy`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Recalculer l’origine à chaque requête (host Metro / env peuvent être périmés au premier import).
apiClient.interceptors.request.use((config) => {
  config.baseURL = `${getProxyBaseUrl()}/api/proxy`;
  return config;
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    /** Empreinte stable par installation Expo — alertes de connexion (éviter `import()` ici : chunk async → Network Error sur le web). */
    try {
      const raw = Constants.installationId || Constants.sessionId;
      if (raw && typeof raw === 'string' && config.headers) {
        (config.headers as Record<string, string>)['X-AFW-Device-Id'] = raw.slice(0, 128);
      }
    } catch {
      /* ignore */
    }
    clearContentTypeForFormData(config);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getItem('refreshToken');
        if (refreshToken) {
          // Use proxy for token refresh too
          const proxyBase = `${getProxyBaseUrl()}/api/proxy`;
          const response = await axios.post(`${proxyBase}/auth/refresh`, {
            refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          const data = response.data?.data || response.data;
          const { accessToken, refreshToken: newRefreshToken } = data;
          await secureStorage.setItem('accessToken', accessToken);
          let nextRefresh = refreshToken;
          if (newRefreshToken) {
            await secureStorage.setItem('refreshToken', newRefreshToken);
            nextRefresh = newRefreshToken;
          }

          /** Garde Zustand aligné avec le stockage persistant (Web + natif). */
          useAuthStore.setState({
            accessToken,
            refreshToken: typeof nextRefresh === 'string' ? nextRefresh : null,
          });

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          // Sans ceci, le retry garde `Content-Type: application/json` → multer ne reçoit pas le fichier (400).
          clearContentTypeForFormData(originalRequest);
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed, user needs to re-login
        await secureStorage.deleteItem('accessToken');
        await secureStorage.deleteItem('refreshToken');
        await secureStorage.deleteItem('user');
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
