import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';
import { getBackendOrigin } from '../config/backendBase';
import { accessTokenExpiresWithin } from '../utils/jwtPayload';
import { logoutAfterFailedRefresh, tryRefreshAccessToken } from './tokenRefresh';
import { attachUserFacingApiError } from '../utils/userFacingError';
import { devLog } from '../utils/devLog';
import { getAfriDeviceIdForRequestHeader } from '../utils/afwDeviceRequestId';

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
      /**
       * Évite un 401 en plein multipart : sur RN, le réessai axios avec le même `FormData` peut
       * produire « Network Error ». On rafraîchit avant envoi si l’access token expire bientôt.
       */
      if (config.data instanceof FormData) {
        let token = await secureStorage.getItem('accessToken');
        if (accessTokenExpiresWithin(token, 90)) {
          await tryRefreshAccessToken();
          token = await secureStorage.getItem('accessToken');
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        const token = await secureStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      devLog('Error getting token:', error);
    }
    /** Comme `mobileClient` : toujours présent pour l’exemption CSRF côté API (cookies tiers + Origin mobile). */
    try {
      if (config.headers) {
        (config.headers as Record<string, string>)['X-AFW-Device-Id'] = getAfriDeviceIdForRequestHeader();
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

      const refreshToken = await secureStorage.getItem('refreshToken');
      if (refreshToken?.trim()) {
        const ok = await tryRefreshAccessToken();
        if (ok) {
          const accessToken = await secureStorage.getItem('accessToken');
          originalRequest.headers.Authorization = `Bearer ${accessToken || ''}`;
          // Sans ceci, le retry garde `Content-Type: application/json` → multer ne reçoit pas le fichier (400).
          clearContentTypeForFormData(originalRequest);
          /**
           * Multipart + même instance `FormData` : souvent cassé sur RN après le premier envoi.
           * Le refresh proactif (intercepteur requête) évite en général ce 401 ; si on arrive quand même ici,
           * ne pas réessayer : l’appelant doit refaire un `FormData` neuf (ex. `profile-edit` via `fetch`).
           */
          if (originalRequest.data instanceof FormData) {
            attachUserFacingApiError(error);
            return Promise.reject(error);
          }
          return apiClient(originalRequest);
        }
        await logoutAfterFailedRefresh();
      }
    }

    attachUserFacingApiError(error);
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
