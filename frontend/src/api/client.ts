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

/**
 * Timeout long par défaut pour absorber :
 *  1. **Cold start Render free tier** (le service dort après 15 min d'inactivité ;
 *     le 1er request prend 30-60s pour réveiller le serveur).
 *  2. **Réseaux 2G/3G en Afrique de l'Ouest** où la latence + jitter dépassent
 *     fréquemment 30s sur des requêtes JSON normales.
 *
 * Les uploads multipart (vidéo / image) gardent leur propre timeout (cf. `create.tsx`,
 * `profile-edit.tsx`) — ils sont déjà à 3-15 min.
 */
const DEFAULT_API_TIMEOUT_MS = 90_000;

const apiClient = axios.create({
  baseURL: `${getProxyBaseUrl()}/api/proxy`,
  timeout: DEFAULT_API_TIMEOUT_MS,
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
        /**
         * Uploads longs (vidéo 5 min, etc.) : la marge doit couvrir `config.timeout` + marge,
         * sinon le JWT peut expirer en plein multipart → « Network Error » côté RN.
         */
        const reqTimeoutMs =
          typeof config.timeout === 'number' && Number.isFinite(config.timeout) ? config.timeout : 30000;
        const minRemainingSec =
          reqTimeoutMs >= 120_000
            ? Math.min(Math.ceil(reqTimeoutMs / 1000) + 300, 86_400)
            : 600;
        if (accessTokenExpiresWithin(token, minRemainingSec)) {
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

/**
 * Détecte les erreurs réseau "no response" (timeout, DNS down, abort) typiques d'un
 * cold start Render ou d'un signal 2G/3G qui tombe. Les erreurs HTTP (4xx/5xx) ont
 * une `response` et ne sont PAS considérées comme network errors.
 */
function isLikelyNetworkOrColdStartError(error: any): boolean {
  if (!error) return false;
  if (error.response) return false;
  const code = String(error.code || '').toUpperCase();
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ETIMEDOUT') return true;
  const msg = String(error.message || '').toLowerCase();
  return /network|failed to connect|socket|aborted|timeout|connection/i.test(msg);
}

// Response interceptor for token refresh + cold-start retry (Render free tier)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    /**
     * Cold start Render / réseau 2G : 1 retry après warmup. Limité aux requêtes JSON
     * idempotentes (GET / HEAD) — on ne réessaie PAS un POST upload (l'utilisateur
     * verrait son contenu publié 2x).
     */
    if (
      isLikelyNetworkOrColdStartError(error)
      && originalRequest
      && !originalRequest._coldStartRetry
      && !(originalRequest.data instanceof FormData)
      && ['get', 'head'].includes(String(originalRequest.method || 'get').toLowerCase())
    ) {
      originalRequest._coldStartRetry = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const warmup = require('./backendWarmup') as { warmupBackend: () => Promise<boolean> };
        await warmup.warmupBackend();
      } catch {
        /* ignore */
      }
      try {
        return await apiClient(originalRequest);
      } catch (retryErr) {
        attachUserFacingApiError(retryErr);
        return Promise.reject(retryErr);
      }
    }

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
