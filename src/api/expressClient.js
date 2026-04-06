// AfriWonder full review PR - CodeRabbit
import axios from 'axios';
import { getItem } from '@/utils/safeStorage';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  setCachedAuthUser,
} from '@/lib/secureTokenStorage';

const raw = import.meta.env.VITE_API_URL;
const API_URL = raw
  ? `${raw.replace(/\/api\/?$/, '')}/api`
  : (import.meta.env.DEV ? '/api' : '/api');

export { API_URL };

const DEFAULT_TIMEOUT_MS = 30000;
/** Inscription : peut attendre PostgreSQL / réseau local — évite faux timeout à 30 s */
const AUTH_REGISTER_TIMEOUT_MS = 90000;
const UPLOAD_TIMEOUT_MS = 300000;
/** E2EE : crypto WebCrypto + plusieurs allers-retours (register, prekeys) ; Supabase peut dépasser 30 s. */
const E2EE_REQUEST_TIMEOUT_MS = 90000;
const MAX_NETWORK_RETRIES = 2; // 2 retries = 3 attempts total (connexions difficiles Afrique)
const RETRY_DELAYS_MS = [1000, 2000]; // backoff

function getDirectUploadThresholdBytes() {
  const mb = Number(import.meta?.env?.VITE_UPLOAD_DIRECT_THRESHOLD_MB ?? 18);
  if (!Number.isFinite(mb) || mb < 1) return 18 * 1024 * 1024;
  return Math.round(mb * 1024 * 1024);
}

/** Évite application/octet-stream sur PUT R2 (Firefox / lecteurs stricts). */
function normalizeClientVideoContentType(blob) {
  const t = (blob?.type || '').toLowerCase().trim();
  if (!t || t === 'application/octet-stream' || t === 'binary/octet-stream') return 'video/mp4';
  return blob.type;
}

async function putToPresignedUrl(uploadUrl, file, contentType, onProgress) {
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType || file?.type || 'application/octet-stream');
    xhr.upload.onprogress = (evt) => {
      if (!evt || !evt.total) return;
      const pct = Math.min(100, Math.round((evt.loaded * 100) / evt.total));
      onProgress?.(pct);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(true);
      else reject(new Error(`direct_upload_http_${xhr.status || 0}`));
    };
    xhr.onerror = () => reject(new Error('direct_upload_network'));
    xhr.onabort = () => reject(new Error('direct_upload_abort'));
    xhr.send(file);
  });
}

/** R2 multipart (S3) — gros fichiers, chunks 5 Mo (roadmap Phase 2) */
function getMultipartThresholdBytes() {
  const mb = Number(import.meta?.env?.VITE_UPLOAD_MULTIPART_THRESHOLD_MB ?? 20);
  if (!Number.isFinite(mb) || mb < 5) return 20 * 1024 * 1024;
  return Math.round(mb * 1024 * 1024);
}

function putPartToPresignedUrl(uploadUrl, blob, contentType) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const raw = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
        const etag = String(raw).replace(/^\"|\"$/g, '');
        if (!etag) reject(new Error('multipart_no_etag'));
        else resolve({ etag });
      } else reject(new Error(`multipart_part_${xhr.status || 0}`));
    };
    xhr.onerror = () => reject(new Error('multipart_network'));
    xhr.send(blob);
  });
}

async function uploadVideoMultipartR2(blob, videoCt, onProgress) {
  const PART = 5 * 1024 * 1024;
  const { data: initWrap } = await axiosInstance.post('/upload/multipart/init', {
    kind: 'video',
    filename: blob.name || 'video.mp4',
    contentType: videoCt,
  });
  const init = initWrap?.data ?? initWrap;
  const { key, uploadId } = init;
  const parts = [];
  const total = blob.size;
  let offset = 0;
  let partNumber = 1;
  try {
    while (offset < total) {
      const end = Math.min(offset + PART, total);
      const chunk = blob.slice(offset, end);
      const { data: urlWrap } = await axiosInstance.post('/upload/multipart/part-url', {
        key,
        uploadId,
        partNumber,
      });
      const pu = urlWrap?.data ?? urlWrap;
      const { etag } = await putPartToPresignedUrl(pu.uploadUrl, chunk, videoCt);
      parts.push({ PartNumber: partNumber, ETag: etag });
      offset = end;
      partNumber += 1;
      onProgress?.(Math.min(90, Math.round((offset * 90) / total)));
    }
    const { data: doneWrap } = await axiosInstance.post('/upload/multipart/complete', {
      key,
      uploadId,
      parts,
    });
    const done = doneWrap?.data ?? doneWrap;
    onProgress?.(90);
    return { file_url: done.file_url };
  } catch (e) {
    try {
      await axiosInstance.post('/upload/multipart/abort', { key, uploadId });
    } catch (_) {}
    throw e;
  }
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const deviceId = localStorage.getItem('afw_device_id');
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    }
  } catch (_) {}
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si c'est une erreur 401 et qu'on n'a pas déjà tenté de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      const reqUrl = String(originalRequest?.url || '');
      const isRefreshCall = reqUrl.includes('/auth/refresh');
      const isLoginOrRegister = /\/auth\/(login|register)($|\?)/.test(reqUrl);
      if (isRefreshCall || isLoginOrRegister) {
        return Promise.reject(error);
      }

      const applyAuthHeader = (req, accessToken) => {
        if (accessToken) req.headers.Authorization = `Bearer ${accessToken}`;
        else delete req.headers.Authorization;
      };

      // Si on est déjà en train de rafraîchir, mettre en queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            applyAuthHeader(originalRequest, token || null);
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            timeout: DEFAULT_TIMEOUT_MS,
          }
        );
        const newToken = data?.data?.accessToken;
        const newRefresh = data?.data?.refreshToken;
        if (newToken) await setAccessToken(newToken);
        if (newRefresh) await setRefreshToken(newRefresh);

        applyAuthHeader(originalRequest, newToken || null);
        processQueue(null, newToken || null);
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (_refreshError) {
        await clearTokens();
        await setCachedAuthUser(null);
        processQueue(_refreshError);
        isRefreshing = false;

        // Ne rediriger que si ce n'est pas déjà la page d'accueil
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(_refreshError);
      }
    }

    // Retry automatique pour erreurs réseau / timeout (connexions lentes ou instables, ex. Afrique)
    const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response;
    const isRetryableMethod = originalRequest?.method && ['get', 'GET', 'head', 'HEAD'].includes(originalRequest.method);
    const retryCount = originalRequest?._networkRetryCount ?? 0;
    if (isNetworkError && originalRequest && isRetryableMethod && retryCount < MAX_NETWORK_RETRIES) {
      originalRequest._networkRetryCount = retryCount + 1;
      const delay = RETRY_DELAYS_MS[retryCount] ?? 2000;
      await new Promise((r) => setTimeout(r, delay));
      return axiosInstance(originalRequest);
    }

    // Message d'erreur unifié pour affichage (toasts, formulaires) — jamais de détail technique
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.apiMessage = 'La requête a pris trop de temps. Vérifiez votre connexion et réessayez.';
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      error.apiMessage = 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    } else if (error.response?.status === 429) {
      const raw = error.response?.data?.error ?? error.response?.data?.message;
      error.apiMessage = typeof raw === 'string' ? raw : (raw?.message ?? 'Trop de requêtes. Réessayez dans quelques secondes.');
    } else {
      const d = error.response?.data;
      /** API AfriWonder : { success: false, error: { message } } ou error: string (legacy) */
      let extracted =
        d && typeof d === 'object' && d.error && typeof d.error === 'object' && typeof d.error.message === 'string'
          ? d.error.message
          : null;
      if (!extracted && d && typeof d === 'object' && typeof d.error === 'string') extracted = d.error;
      if (!extracted && typeof d?.message === 'string') extracted = d.message;
      if (!extracted && typeof d === 'string') extracted = d;
      const raw = extracted ?? d?.error ?? error.message;
      let msg =
        typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? raw.message || 'Une erreur est survenue' : 'Une erreur est survenue';
      // R2 / S3 : message anglais côté SDK si le backend ne mappe pas encore
      if (typeof msg === 'string' && /access denied/i.test(msg) && !/stockage média|Cloudflare R2/i.test(msg)) {
        msg =
          'Stockage média : accès refusé (Cloudflare R2). Vérifiez R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et les permissions d’écriture sur le bucket (backend/.env).';
      }
      error.apiMessage = msg;
    }
    return Promise.reject(error);
  }
);

/** Upload requests: omit Content-Type so browser sets multipart boundary. */
function uploadConfig() {
  return {
    transformRequest: [(data, headers) => {
      if (typeof FormData !== 'undefined' && data instanceof FormData) {
        delete headers['Content-Type'];
      }
      return data;
    }],
  };
}

export const api = {
  // Délégation directe pour les routes non encapsulées (legal, privacy, etc.)
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  patch: (url, data, config) => axiosInstance.patch(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),

  platform: {
    async getFeatureFlags() {
      const { data } = await axiosInstance.get('/platform/feature-flags');
      return data.data || {};
    },
    async getConfig() {
      const { data } = await axiosInstance.get('/platform/config');
      return data.data;
    },
    async getStats() {
      const { data } = await axiosInstance.get('/platform/stats');
      return data.data || { totalUsers: 0, totalVideos: 0, totalCreators: 0 };
    },
  },

  earlyAccess: {
    async getConfig() {
      const { data } = await axiosInstance.get('/early-access/config');
      return data.data || { maxUsers: 10000, totalUsers: 0, isFull: false, spotsLeft: 10000 };
    },
    async joinWaitlist(email, fullName) {
      const { data } = await axiosInstance.post('/early-access/waitlist', { email, full_name: fullName });
      return data.data;
    },
    async setMaxUsers(max) {
      const { data } = await axiosInstance.put('/early-access/max-users', { maxUsers: max });
      return data.data;
    },
    async setMaxMonetizedCreators(max) {
      const { data } = await axiosInstance.put('/early-access/max-monetized', { maxMonetizedCreators: max });
      return data.data;
    },
    async getWaitlist() {
      const { data } = await axiosInstance.get('/early-access/waitlist');
      return data.data;
    },
  },

  platformDonations: {
    async create(donation) {
      const { data } = await axiosInstance.post('/platform-donations', donation);
      return data.data;
    },
  },

  platformFeedback: {
    async create(feedback) {
      const { data } = await axiosInstance.post('/platform-feedback', feedback);
      return data.data;
    },
  },

  auth: {
    async login(identifier, password) {
      const { data } = await axiosInstance.post('/auth/login', { email: identifier, identifier, password });
      await setAccessToken(data.data.accessToken);
      await setRefreshToken(data.data.refreshToken);
      return data.data.user;
    },
    async register(userData) {
      const { data } = await axiosInstance.post('/auth/register', userData, {
        timeout: AUTH_REGISTER_TIMEOUT_MS,
      });
      await setAccessToken(data.data.accessToken);
      await setRefreshToken(data.data.refreshToken);
      return data.data.user;
    },
    async me() {
      const token = await getAccessToken();
      if (!token) {
        const error = Object.assign(new Error('No token available'), { response: { status: 401 } });
        throw error;
      }
      const { data } = await axiosInstance.get('/auth/me');
      return data.data;
    },
    async logout() {
      await clearTokens();
      await setCachedAuthUser(null);
    },
    async updateMe(userData) {
      const { data } = await axiosInstance.put('/users/me', userData);
      return data.data;
    },
  },
  /** CPO 1.18, 2.2, 2.33 — liste proches, demandes de suivi, suggestions */
  me: {
    async getCloseFriends() {
      const { data } = await axiosInstance.get('/me/close-friends');
      return data.data ?? [];
    },
    async addCloseFriend(friendId) {
      const { data } = await axiosInstance.post('/me/close-friends', { friend_id: friendId });
      return data.data;
    },
    async removeCloseFriend(friendId) {
      await axiosInstance.delete(`/me/close-friends/${friendId}`);
    },
    async getFollowRequests() {
      const { data } = await axiosInstance.get('/me/follow-requests');
      return data.data ?? [];
    },
    async acceptFollowRequest(requestId) {
      const { data } = await axiosInstance.post(`/me/follow-requests/${requestId}/accept`);
      return data;
    },
    async rejectFollowRequest(requestId) {
      const { data } = await axiosInstance.post(`/me/follow-requests/${requestId}/reject`);
      return data;
    },
    async getSuggestedFollows(limit = 20) {
      const { data } = await axiosInstance.get('/me/suggested-follows', { params: { limit } });
      return data.data ?? [];
    },
    async getFeedVideoStates(ids = []) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return { likedIds: [], savedIds: [] };
      }
      const { data } = await axiosInstance.get('/me/feed-video-states', {
        params: { ids: ids.join(',') },
      });
      return data.data ?? { likedIds: [], savedIds: [] };
    },
    async getSessions() {
      const { data } = await axiosInstance.get('/me/sessions');
      return data.data ?? [];
    },
    async revokeSession(sessionId) {
      await axiosInstance.delete(`/me/sessions/${sessionId}`);
    },
    /** CDC Appels — agrège DirectCall + participations GroupCall */
    async getCallHistory(page = 1, limit = 20) {
      const { data } = await axiosInstance.get('/me/call-history', { params: { page, limit } });
      return data.data ?? { items: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };
    },
    async getActivity(limit = 50) {
      const { data } = await axiosInstance.get('/me/activity', { params: { limit } });
      return data.data ?? [];
    },
    // CPO 9.33 — Alertes prix voyage
    getTravelAlerts(params = {}) {
      return axiosInstance.get('/me/travel-alerts', { params }).then(({ data }) => ({ alerts: data.data ?? [], pagination: data.pagination }));
    },
    createTravelAlert(payload) {
      return axiosInstance.post('/me/travel-alerts', payload).then(({ data }) => data.data);
    },
    deleteTravelAlert(id) {
      return axiosInstance.delete(`/me/travel-alerts/${id}`).then(() => {});
    },
    // CPO 9.25 — Mes groupes d'achat
    getGroupBuys(params = {}) {
      return axiosInstance.get('/me/group-buys', { params }).then(({ data }) => ({ groups: data.data ?? [], pagination: data.pagination }));
    },
    // CPO 11.36 — Variante A/B
    getExperiment(key) {
      return axiosInstance.get(`/me/experiment/${encodeURIComponent(key)}`).then(({ data }) => data.data);
    },
    // CPO 5.9 — Cartes virtuelles
    getVirtualCards() {
      return axiosInstance.get('/me/virtual-cards').then(({ data }) => data.data ?? []);
    },
    createVirtualCard(options) {
      return axiosInstance.post('/me/virtual-cards', options ?? {}).then(({ data }) => data.data);
    },
    revokeVirtualCard(id) {
      return axiosInstance.delete(`/me/virtual-cards/${id}`).then(({ data }) => data.data);
    },
    // CPO 5.23 — Transferts internationaux
    getInternationalTransfers(params = {}) {
      return axiosInstance.get('/me/international-transfers', { params }).then(({ data }) => ({ items: data.data ?? [], pagination: data.pagination }));
    },
    createInternationalTransfer(payload) {
      return axiosInstance.post('/me/international-transfers', payload).then(({ data }) => data.data);
    },
    getInternationalTransfer(id) {
      return axiosInstance.get(`/me/international-transfers/${id}`).then(({ data }) => data.data);
    },
    // CPO 5.39 — Préautorisation
    getPreauths(params = {}) {
      return axiosInstance.get('/me/preauths', { params }).then(({ data }) => ({ items: data.data ?? [], pagination: data.pagination }));
    },
    createPreauth(payload) {
      return axiosInstance.post('/me/preauths', payload).then(({ data }) => data.data);
    },
    capturePreauth(id) {
      return axiosInstance.post(`/me/preauths/${id}/capture`).then(({ data }) => data.data);
    },
    cancelPreauth(id) {
      return axiosInstance.post(`/me/preauths/${id}/cancel`).then(({ data }) => data.data);
    },
    // CPO 7.19 — Contrats créateur
    getCreatorContracts() {
      return axiosInstance.get('/me/creator-contracts').then(({ data }) => data.data ?? []);
    },
    createCreatorContract(payload) {
      return axiosInstance.post('/me/creator-contracts', payload).then(({ data }) => data.data);
    },
    updateCreatorContract(id, payload) {
      return axiosInstance.patch(`/me/creator-contracts/${id}`, payload).then(({ data }) => data.data);
    },
    deleteCreatorContract(id) {
      return axiosInstance.delete(`/me/creator-contracts/${id}`).then(() => {});
    },
  },
  groupBuys: {
    join(groupBuyId, quantity = 1) {
      return axiosInstance.post(`/group-buys/${groupBuyId}/join`, { quantity }).then(({ data }) => data.data);
    },
  },
  // CPO 9.22 — Co-voiturage
  rideShare: {
    list(params = {}) {
      return axiosInstance.get('/ride-share', { params }).then(({ data }) => ({
        rides: data.data ?? [],
        pagination: data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      }));
    },
    getById(id) {
      return axiosInstance.get(`/ride-share/${id}`).then(({ data }) => data.data);
    },
    create(body) {
      return axiosInstance.post('/ride-share', body).then(({ data }) => data.data);
    },
    book(rideShareId, seats = 1) {
      return axiosInstance.post(`/ride-share/${rideShareId}/book`, { seats }).then(({ data }) => data.data);
    },
    listMy(asDriver = false) {
      return axiosInstance.get('/ride-share/me', { params: asDriver ? { as: 'driver' } : {} }).then(({ data }) => data.data ?? []);
    },
  },
  videos: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/videos', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/videos/${id}`);
      return data.data;
    },
    async create(videoData) {
      const { data } = await axiosInstance.post('/videos', videoData);
      return data.data;
    },
    async update(id, videoData) {
      const { data } = await axiosInstance.put(`/videos/${id}`, videoData);
      return data.data;
    },
    async delete(id) {
      await axiosInstance.delete(`/videos/${id}`);
    },
    async like(id, type = 'like') {
      const { data } = await axiosInstance.post(`/videos/${id}/like`, type ? { type } : undefined);
      return data.data;
    },
    /** Réactions multiples (CPO 2.44) — type: 'like' | 'love' | 'fire' | etc. */
    async setReaction(id, type) {
      const { data } = await axiosInstance.post(`/videos/${id}/reaction`, { type });
      return data.data;
    },
    async deleteReaction(id) {
      const { data } = await axiosInstance.delete(`/videos/${id}/reaction`);
      return data.data;
    },
    async comment(id, content, parentId = null) {
      const { data } = await axiosInstance.post(`/videos/${id}/comment`, { content, parentId });
      return data.data;
    },
    async getComments(id, params = {}, options = {}) {
      const timeoutMs = Number.isFinite(options?.timeoutMs) ? options.timeoutMs : 12000;
      const { data } = await axiosInstance.get(`/videos/${id}/comments`, { params, timeout: timeoutMs });
      return data.data;
    },
    async share(id) {
      const { data } = await axiosInstance.post(`/videos/${id}/share`);
      return data.data;
    },
    async recordView(id, opts = {}) {
      const { watchSeconds = 0, watchPercent = 0, deviceId, scrollSlow, interactionDetected } = opts;
      const { data } = await axiosInstance.post(`/videos/${id}/view`, {
        watchSeconds,
        watchPercent,
        deviceId: deviceId || getItem('afw_device_id'),
        scrollSlow,
        interactionDetected,
      });
      return data;
    },
    /** Ré-encode la vidéo en H.264 web (créateur) — utile si une seule vidéo refuse Firefox / WebView. */
    async repairWebPlayback(id) {
      const { data } = await axiosInstance.post(
        `/videos/${id}/repair-web-playback`,
        {},
        {
          timeout: Math.max(Number(UPLOAD_TIMEOUT_MS) || 300000, 900000),
        }
      );
      return data;
    },
    async tip(id, { amount, phone, message }) {
      const { data } = await axiosInstance.post(`/videos/${id}/tip`, { amount, phone, message });
      return data.data;
    },
    async tipWithWallet(id, { amount, message }) {
      const { data } = await axiosInstance.post(`/videos/${id}/tip-wallet`, { amount, message });
      return data.data;
    },
    async getTrendingHashtags(limit = 15) {
      const { data } = await axiosInstance.get('/videos/hashtags/trending', { params: { limit } });
      return data.data || [];
    },
    // CPO 3.9 — Sous-titres automatiques
    async getSubtitles(videoId) {
      const { data } = await axiosInstance.get(`/videos/${videoId}/subtitles`);
      return data.data;
    },
    async generateSubtitles(videoId, source = 'auto') {
      const { data } = await axiosInstance.post(`/videos/${videoId}/subtitles/generate`, { source });
      return data.data;
    },
    async setSubtitleUrl(videoId, subtitleUrl) {
      const { data } = await axiosInstance.patch(`/videos/${videoId}/subtitles`, { subtitle_url: subtitleUrl });
      return data.data;
    },
  },
  feed: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/feed', { params });
      return data.data;
    },
  },
  /** Reco vidéo (Phase 4 — remplaçable par TF.js / modèle Python) */
  recommendations: {
    async listVideos(params = {}) {
      const { data } = await axiosInstance.get('/recommendations/videos', { params });
      return data.data;
    },
  },
  /** Posts (feed social) avec sondages (CPO 2.20) — aligné backend /api/posts */
  posts: {
    async create(payload) {
      const { data } = await axiosInstance.post('/posts', payload);
      return data.data;
    },
    async list(params = {}) {
      const { data } = await axiosInstance.get('/posts', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/posts/${id}`);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.put(`/posts/${id}`, payload);
      return data.data;
    },
    async delete(id) {
      await axiosInstance.delete(`/posts/${id}`);
    },
    async votePoll(pollId, optionIndex) {
      const { data } = await axiosInstance.post(`/posts/polls/${pollId}/vote`, { option_index: optionIndex });
      return data.data;
    },
  },
  /** Recherche globale CDC : un seul appel pour vidéos, utilisateurs, produits */
  search: {
    async global(params = {}) {
      const { data } = await axiosInstance.get('/search', {
        params: {
          q: params.q ?? params.query ?? '',
          type: params.type ?? 'all',
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          category: params.category,
          hashtag: params.hashtag,
          duration: params.duration,
        },
      });
      return data.data;
    },
    async suggest(params = {}) {
      const { data } = await axiosInstance.get('/search/suggest', {
        params: { q: params.q ?? params.query ?? '', limit: params.limit ?? 8 },
      });
      return data.data;
    },
  },
  ads: {
    async recordImpression(creativeId, campaignId, deviceId) {
      const { data } = await axiosInstance.post('/ads/impression', {
        creative_id: creativeId,
        campaign_id: campaignId,
        device_id: deviceId,
      });
      return data;
    },
    async recordClick(creativeId, campaignId, deviceId) {
      const { data } = await axiosInstance.post('/ads/click', {
        creative_id: creativeId,
        campaign_id: campaignId,
        device_id: deviceId,
      });
      return data;
    },
    async reportAd(campaignId, reason) {
      const { data } = await axiosInstance.post('/ads/report', { campaign_id: campaignId, reason });
      return data;
    },
    async getPricing() {
      const { data } = await axiosInstance.get('/ads/pricing');
      return data.data;
    },
    async getCampaigns(params = {}) {
      const { data } = await axiosInstance.get('/ads/campaigns', { params });
      return data.data;
    },
    async getCampaignStats(id) {
      const { data } = await axiosInstance.get(`/ads/campaigns/${id}`);
      return data.data;
    },
    async updateCampaign(id, payload) {
      const { data } = await axiosInstance.put(`/ads/campaigns/${id}`, payload);
      return data.data;
    },
    async deleteCampaign(id) {
      const { data } = await axiosInstance.delete(`/ads/campaigns/${id}`);
      return data;
    },
    async createCampaign(payload) {
      const { data } = await axiosInstance.post('/ads/campaigns', payload);
      return data.data;
    },
    async addCreative(campaignId, payload) {
      const { data } = await axiosInstance.post(`/ads/campaigns/${campaignId}/creatives`, payload);
      return data.data;
    },
    async submitCampaign(campaignId) {
      const { data } = await axiosInstance.post(`/ads/campaigns/${campaignId}/submit`);
      return data.data;
    },
    async getPendingCampaigns() {
      const { data } = await axiosInstance.get('/ads/campaigns/pending');
      return data.data;
    },
    async getAdminCampaigns(status) {
      const { data } = await axiosInstance.get('/ads/campaigns/admin', {
        params: status ? { status } : {},
      });
      return data.data;
    },
    async approveCampaign(campaignId) {
      const { data } = await axiosInstance.post(`/ads/campaigns/${campaignId}/approve`);
      return data.data;
    },
    async rejectCampaign(campaignId, reason) {
      const { data } = await axiosInstance.post(`/ads/campaigns/${campaignId}/reject`, { reason });
      return data.data;
    },
  },
  creatorSupport: {
    async support(creatorId, { amount_fcfa, message }) {
      const { data } = await axiosInstance.post(`/creator-support/${creatorId}`, { amount_fcfa, message });
      return data.data;
    },
    async getStats(creatorId) {
      const { data } = await axiosInstance.get(`/creator-support/${creatorId}/stats`);
      return data.data;
    },
  },
  creatorDashboard: {
    async getDashboard() {
      const { data } = await axiosInstance.get('/creator-dashboard');
      return data.data ?? data;
    },
    async requestMonetization() {
      const { data } = await axiosInstance.post('/creator-dashboard/request-monetization');
      return data;
    },
  },
  referrals: {
    async getStats() {
      const { data } = await axiosInstance.get('/referrals/stats');
      return data.data;
    },
    async getCode() {
      const { data } = await axiosInstance.get('/referrals/code');
      return data.data?.code;
    },
  },
  viralBonuses: {
    async getPending() {
      const { data } = await axiosInstance.get('/viral-bonuses/pending');
      return data.data;
    },
    async pay(id) {
      const { data } = await axiosInstance.post(`/viral-bonuses/${id}/pay`);
      return data.data;
    },
  },
  creatorSubscription: {
    async getTiers() {
      const { data } = await axiosInstance.get('/creator-subscription/tiers');
      return data.data;
    },
    async subscribe(tier) {
      const { data } = await axiosInstance.post('/creator-subscription/subscribe', { tier });
      return data.data;
    },
    async getMySubscription() {
      const { data } = await axiosInstance.get('/creator-subscription/me');
      return data.data;
    },
    async getCreatorSubscription(creatorId) {
      const { data } = await axiosInstance.get(`/creator-subscription/${creatorId}`);
      return data.data;
    },
  },
  users: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/users', { params });
      const result = data.data;
      return Array.isArray(result) ? result : (result?.users || []);
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/users/${id}`);
      return data.data;
    },
    async update(id, userData) {
      const { data } = await axiosInstance.put(`/users/${id}`, userData);
      return data.data;
    },
    async getFollowers(id, params = {}) {
      const { data } = await axiosInstance.get(`/users/${id}/followers`, { params });
      return data.data;
    },
    async getFollowing(id, params = {}) {
      const { data } = await axiosInstance.get(`/users/${id}/following`, { params });
      return data.data;
    },
    async toggleFollow(id) {
      const { data } = await axiosInstance.post(`/users/${id}/follow`);
      return data.data;
    },
    async toggleWonder(id) {
      const { data } = await axiosInstance.post(`/users/${id}/wonder`);
      return data.data;
    },
    async getWonderers(id) {
      const { data } = await axiosInstance.get(`/users/${id}/wonderers`);
      return data.data;
    },
    async getStats(id) {
      const { data } = await axiosInstance.get(`/users/${id}/stats`);
      return data.data;
    },
    async getLikedVideos(id, params = {}) {
      try {
        // Utiliser l'endpoint backend pour les vidéos likées (sans limite si limit=0)
        const { data } = await axiosInstance.get(`/users/${id}/liked-videos`, { 
          params: { 
            page: params.page || 1, 
            limit: params.limit !== undefined ? params.limit : 0 
          } 
        });
        
        // Retourner les vidéos avec la pagination
        if (data.data && data.data.videos) {
          return data.data.videos;
        }
        
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        console.error('Error getting liked videos:', error);
        return [];
      }
    },
  },
  products: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/products', { params });
      return data.data;
    },
    async getSuggestions(query, limit = 8) {
      const { data } = await axiosInstance.get('/products/suggestions', { params: { q: query, limit } });
      return data.data || [];
    },
    async getHighlights(params = {}) {
      const { data } = await axiosInstance.get('/products/highlights', {
        params: {
          trending_limit: params.trendingLimit || 8,
          new_limit: params.newLimit || 8,
        },
      });
      return data.data || { trending: [], newest: [] };
    },
    async getRecommendations(limit = 8) {
      const { data } = await axiosInstance.get('/products/recommendations', { params: { limit } });
      return data.data || [];
    },
    async getNearby(latitudeOrOptions, longitude, radiusKm = 50, limit = 200) {
      let params;
      if (typeof latitudeOrOptions === 'object' && latitudeOrOptions !== null) {
        const o = latitudeOrOptions;
        params = {
          latitude: o.latitude,
          longitude: o.longitude,
          radius_km: o.radius_km ?? o.radiusKm ?? 50,
          limit: o.limit ?? 200,
          category: o.category,
          search: o.search,
          min_price: o.min_price ?? o.minPrice,
          max_price: o.max_price ?? o.maxPrice,
          condition: o.condition,
          delivery_option: o.delivery_option ?? o.deliveryOption,
          verified_seller: o.verified_seller ?? o.verifiedSeller,
          min_rating: o.min_rating ?? o.minRating,
          seller_country: o.seller_country ?? o.sellerCountry,
          min_lat: o.min_lat ?? o.minLat,
          max_lat: o.max_lat ?? o.maxLat,
          min_lng: o.min_lng ?? o.minLng,
          max_lng: o.max_lng ?? o.maxLng,
        };
      } else {
        params = { latitude: latitudeOrOptions, longitude, radius_km: radiusKm, limit };
      }
      const { data } = await axiosInstance.get('/products/nearby', { params });
      return data.data || [];
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/products/${id}`);
      return data.data;
    },
    async compare(ids) {
      const idList = Array.isArray(ids) ? ids : [ids].filter(Boolean);
      if (idList.length === 0) return [];
      const { data } = await axiosInstance.get('/products/compare', { params: { ids: idList.join(',') } });
      return data.data || [];
    },
    async create(productData) {
      // Rejeter les URLs de domaines externes non autorisés
      if (productData.images) {
        productData.images.forEach((url, index) => {
          if (url && (url.includes('base44') || url.includes('base44.com'))) {
            throw new Error(`URLs non autorisées pour les images de produit (index ${index}). Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`);
          }
        });
      }
      const { data } = await axiosInstance.post('/products', productData);
      return data.data;
    },
    async update(id, productData) {
      // Rejeter les URLs de domaines externes non autorisés
      if (productData.images) {
        productData.images.forEach((url, index) => {
          if (url && (url.includes('base44') || url.includes('base44.com'))) {
            throw new Error(`URLs non autorisées pour les images de produit (index ${index}). Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).`);
          }
        });
      }
      const { data } = await axiosInstance.put(`/products/${id}`, productData);
      return data.data;
    },
    async delete(id) {
      await axiosInstance.delete(`/products/${id}`);
    },
    async updateStock(id, quantity) {
      const { data } = await axiosInstance.put(`/products/${id}/stock`, { quantity });
      return data.data;
    },
    async getQuestions(productId, params = {}) {
      const { data } = await axiosInstance.get(`/products/${productId}/questions`, { params });
      return data.data;
    },
    async askQuestion(productId, question) {
      const { data } = await axiosInstance.post(`/products/${productId}/questions`, { question });
      return data.data;
    },
    async answerQuestion(questionId, answer) {
      const { data } = await axiosInstance.post(`/products/questions/${questionId}/answer`, { answer });
      return data.data;
    },
    // CPO 6.38 — Alertes prix / stock
    getAlertsMe(params = {}) {
      return axiosInstance.get('/products/alerts/me', { params }).then(({ data }) => ({ alerts: data.data || [], pagination: data.pagination }));
    },
    getAlertsForProduct(productId) {
      return axiosInstance.get(`/products/${productId}/alerts/me`).then(({ data }) => data.data || []);
    },
    addAlert(productId, { alert_type, target_price }) {
      return axiosInstance.post(`/products/${productId}/alerts`, { alert_type, target_price }).then(({ data }) => data.data);
    },
    removeAlert(productId, alertType) {
      return axiosInstance.delete(`/products/${productId}/alerts/${alertType}`).then(() => {});
    },
    // CPO 6.37 — Précommandes
    getPreordersMe(params = {}) {
      return axiosInstance.get('/products/preorders/me', { params }).then(({ data }) => ({ preorders: data.data || [], pagination: data.pagination }));
    },
    createPreorder(productId, quantity = 1) {
      return axiosInstance.post(`/products/${productId}/preorder`, { quantity }).then(({ data }) => data.data);
    },
    cancelPreorder(preorderId) {
      return axiosInstance.delete(`/products/preorders/${preorderId}`).then(() => {});
    },
    // CPO 6.36 — Négociation de prix
    createOffer(productId, offeredPrice) {
      return axiosInstance.post(`/products/${productId}/offers`, { offered_price: offeredPrice }).then(({ data }) => data.data);
    },
    getMyOffer(productId) {
      return axiosInstance.get(`/products/${productId}/offers/me`).then(({ data }) => data.data);
    },
    // CPO 6.35 — Enchères
    getAuction(productId) {
      return axiosInstance.get(`/products/${productId}/auction`).then(({ data }) => data.data);
    },
    createAuction(productId, { start_price, end_at }) {
      return axiosInstance.post(`/products/${productId}/auction`, { start_price, end_at }).then(({ data }) => data.data);
    },
    placeBid(productId, amount) {
      return axiosInstance.post(`/products/${productId}/auction/bid`, { amount }).then(({ data }) => data.data);
    },
    // CPO 9.25 — Groupes d'achat
    getGroupBuys(productId) {
      return axiosInstance.get(`/products/${productId}/group-buys`).then(({ data }) => data.data ?? []);
    },
    createGroupBuy(productId, { min_quantity } = {}) {
      return axiosInstance.post(`/products/${productId}/group-buys`, { min_quantity }).then(({ data }) => data.data);
    },
  },
  cart: {
    async get() {
      const { data } = await axiosInstance.get('/cart');
      return data.data;
    },
    async add(productId, quantity = 1) {
      const { data } = await axiosInstance.post('/cart/add', { productId, quantity });
      return data.data;
    },
    async remove(productId) {
      const { data } = await axiosInstance.delete(`/cart/remove/${productId}`);
      return data.data;
    },
    async update(productId, quantity) {
      const { data } = await axiosInstance.put('/cart/update', { productId, quantity });
      return data.data;
    },
    async clear() {
      const { data } = await axiosInstance.delete('/cart/clear');
      return data.data;
    },
    async applyCoupon(couponCode) {
      const { data } = await axiosInstance.post('/cart/coupon', { couponCode });
      return data.data;
    },
    async getBreakdown() {
      const { data } = await axiosInstance.get('/cart/breakdown');
      return data.data;
    },
  },
  /** Commissions AfriWonder — config + calcul pour afficher les frais avant paiement (backend = source de vérité) */
  commissions: {
    async getConfig() {
      const { data } = await axiosInstance.get('/commissions');
      return data.data ?? data;
    },
    /**
     * Calcule les parts plateforme / autre pour affichage.
     * @param {string} vertical - video_social|marketplace|services|transport|food|telemedicine|property|ticketing|bills|airtime|insurance
     * @param {string} rule - ex: tips|seller|provider|ride|restaurant|ticket|transaction|recharge|brokerage
     * @param {number} amountFcfa - montant en FCFA
     * @param {number} [deliveryFeeFcfa] - pour food rule=delivery_fee
     */
    async calculate(vertical, rule, amountFcfa, deliveryFeeFcfa = 0) {
      const params = { vertical, rule, amount_fcfa: amountFcfa };
      if (deliveryFeeFcfa > 0) params.delivery_fee_fcfa = deliveryFeeFcfa;
      const { data } = await axiosInstance.get('/commissions/calculate', { params });
      return data.data ?? data;
    },
  },
  exchangeRates: {
    async getRates() {
      const { data } = await axiosInstance.get('/exchange-rates/rates');
      return data.data;
    },
    async convert(amount, from, to) {
      const { data } = await axiosInstance.get('/exchange-rates/convert', { params: { amount, from, to } });
      return data.data;
    },
    async setRate(from_currency, to_currency, rate) {
      const { data } = await axiosInstance.put('/exchange-rates/rates', { from_currency, to_currency, rate });
      return data.data;
    },
  },
  sellerProfile: {
    async getMe() {
      const { data } = await axiosInstance.get('/seller-profile/me');
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/seller-profile', payload);
      return data.data;
    },
    async update(payload) {
      const { data } = await axiosInstance.put('/seller-profile', payload);
      return data.data;
    },
  },
  sellerSubscription: {
    async subscribe(tier, options = {}) {
      const { data } = await axiosInstance.post('/seller-subscription/subscribe', {
        tier,
        payment_method: options.payment_method || 'wallet',
        orange_money_phone: options.orange_money_phone,
      });
      return data.data;
    },
    async getActive() {
      const { data } = await axiosInstance.get('/seller-subscription/active');
      return data.data;
    },
  },
  sellerReviews: {
    async listBySeller(sellerId, params = {}) {
      const { data } = await axiosInstance.get(`/seller-reviews/seller/${sellerId}`, { params });
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/seller-reviews', payload);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.put(`/seller-reviews/${id}`, payload);
      return data.data;
    },
    async delete(id) {
      const { data } = await axiosInstance.delete(`/seller-reviews/${id}`);
      return data.data;
    },
  },
  support: {
    async createTicket(subject, message) {
      const { data } = await axiosInstance.post('/support/tickets', { subject, message });
      return data.data;
    },
    async listTickets(params = {}) {
      const { data } = await axiosInstance.get('/support/tickets', { params });
      return data.data;
    },
    async getTicket(id) {
      const { data } = await axiosInstance.get(`/support/tickets/${id}`);
      return data.data;
    },
    async addMessage(ticketId, message) {
      const { data } = await axiosInstance.post(`/support/tickets/${ticketId}/messages`, { message });
      return data.data;
    },
    async updateTicketStatus(id, status) {
      const { data } = await axiosInstance.patch(`/support/tickets/${id}/status`, { status });
      return data.data;
    },
    async submitE2eeDiagnostic(payload = {}) {
      const { data } = await axiosInstance.post('/support/e2ee-diagnostic', payload);
      return data.data;
    },
    async listAllTickets(params = {}) {
      const { data } = await axiosInstance.get('/support/admin/tickets', { params });
      return data.data;
    },
  },
  admin: {
    async getDashboard() {
      const { data } = await axiosInstance.get('/admin/dashboard');
      return data.data;
    },
    async getUsers(params = {}) {
      const { data } = await axiosInstance.get('/admin/users', { params });
      return data.data;
    },
    async banUser(userId, body) {
      const { data } = await axiosInstance.post(`/admin/users/${userId}/ban`, {
        banType: body.banType ?? 'temporary_ban',
        reason: body.reason,
        description: body.description,
        durationDays: body.durationDays ?? 7,
      });
      return data.data;
    },
    async getOrders(params = {}) {
      const { data } = await axiosInstance.get('/admin/orders', { params });
      return data.data;
    },
    async getDisputes(params = {}) {
      const { data } = await axiosInstance.get('/admin/disputes', { params });
      return data.data;
    },
    async getFinanceDashboard() {
      const { data } = await axiosInstance.get('/admin/finance/dashboard');
      return data.data;
    },
    async getMonetizationRequests() {
      const { data } = await axiosInstance.get('/admin/monetization-requests');
      return data.data || [];
    },
    async approveMonetizationRequest(id) {
      const { data } = await axiosInstance.post(`/admin/monetization-requests/${id}/approve`);
      return data;
    },
    async rejectMonetizationRequest(id, reason) {
      const { data } = await axiosInstance.post(`/admin/monetization-requests/${id}/reject`, { reason });
      return data;
    },
    async getSellers(params = {}) {
      const { data } = await axiosInstance.get('/admin/sellers', { params });
      return data.data;
    },
    async updateSellerStatus(id, status) {
      const { data } = await axiosInstance.patch(`/admin/sellers/${id}/status`, { status });
      return data.data;
    },
    async updateSellerVerified(id, is_verified) {
      const { data } = await axiosInstance.patch(`/admin/sellers/${id}/verify`, { is_verified });
      return data.data;
    },
    async getVerifications(params = {}) {
      const { data } = await axiosInstance.get('/admin/verifications', { params });
      return data.data;
    },
    async updateVerification(id, body) {
      const { data } = await axiosInstance.patch(`/admin/verifications/${id}`, body);
      return data.data;
    },
    async getProducts(params = {}) {
      const { data } = await axiosInstance.get('/admin/products', { params });
      return data.data;
    },
    async updateProductStatus(id, status) {
      const { data } = await axiosInstance.patch(`/admin/products/${id}/status`, { status });
      return data.data;
    },
    async suspendCampaign(campaignId, body = {}) {
      const { data } = await axiosInstance.post(`/admin/crowdfunding/${campaignId}/suspend`, body);
      return data.data;
    },
    async getAmlFlags(params = {}) {
      const { data } = await axiosInstance.get('/admin/aml/flags', { params });
      return data.data;
    },
    async getHealth() {
      const { data } = await axiosInstance.get('/admin/health');
      return data.data;
    },
    async getMonitoringErrors() {
      const { data } = await axiosInstance.get('/admin/monitoring/errors');
      return data.data ?? data;
    },
    async getMonitoringHttp() {
      const { data } = await axiosInstance.get('/admin/monitoring/http');
      return data.data ?? data;
    },
    async getLogisticsProviders() {
      const { data } = await axiosInstance.get('/admin/logistics/providers');
      return data.data;
    },
    async listLogisticsRates(params = {}) {
      const { data } = await axiosInstance.get('/admin/logistics/rates', { params });
      return data.data;
    },
    async createLogisticsRate(payload) {
      const { data } = await axiosInstance.post('/admin/logistics/rates', payload);
      return data.data;
    },
    async updateLogisticsRate(id, payload) {
      const { data } = await axiosInstance.put(`/admin/logistics/rates/${id}`, payload);
      return data.data;
    },
    async listPickupPoints(params = {}) {
      const { data } = await axiosInstance.get('/admin/logistics/pickup-points', { params });
      return data.data;
    },
    async createPickupPoint(payload) {
      const { data } = await axiosInstance.post('/admin/logistics/pickup-points', payload);
      return data.data;
    },
    async updatePickupPoint(id, payload) {
      const { data } = await axiosInstance.put(`/admin/logistics/pickup-points/${id}`, payload);
      return data.data;
    },
    async getKillSwitch() {
      const { data } = await axiosInstance.get('/admin/kill-switch');
      return data.data;
    },
    async updateKillSwitch(body) {
      const { data } = await axiosInstance.patch('/admin/kill-switch', body);
      return data.data;
    },
    async getFeatureFlags() {
      const { data } = await axiosInstance.get('/admin/feature-flags');
      return data.data || [];
    },
    async setFeatureFlag(key, enabled) {
      const { data } = await axiosInstance.patch(`/admin/feature-flags/${key}`, { enabled });
      return data.data;
    },
    async getAuditLogs(params = {}) {
      const { data } = await axiosInstance.get('/admin/audit-logs', { params });
      return data.data;
    },
    async freezeWallet(walletId) {
      const { data } = await axiosInstance.post(`/admin/wallets/${walletId}/freeze`);
      return data.data;
    },
    async unfreezeWallet(walletId) {
      const { data } = await axiosInstance.post(`/admin/wallets/${walletId}/unfreeze`);
      return data.data;
    },
    async getStrategicAnalytics(params = {}) {
      const { data } = await axiosInstance.get('/admin/analytics/strategic', { params });
      return data.data;
    },
    async getLiveRevenueByCreator(params = {}) {
      const { data } = await axiosInstance.get('/admin/live-revenue-by-creator', { params });
      return data.data;
    },
    async exportStrategicAnalytics(params = {}) {
      const res = await axiosInstance.get('/admin/analytics/strategic/export', { params, responseType: 'blob' });
      return res.data;
    },
    async getCommissionConfig() {
      const { data } = await axiosInstance.get('/admin/commissions/config');
      return data.data;
    },
    async updateCommissionConfig(overrides, merge = true) {
      const { data } = await axiosInstance.patch('/admin/commissions/config', { overrides, merge });
      return data.data;
    },
    async resetCommissionConfig() {
      const { data } = await axiosInstance.post('/admin/commissions/config/reset');
      return data.data;
    },
    // AI Engine
    async getAIEngineStats() {
      const { data } = await axiosInstance.get('/admin/ai-engine/stats');
      return data.data || data;
    },
    async getAIFeatures() {
      const { data } = await axiosInstance.get('/admin/ai-engine/features');
      return data.data || data;
    },
    async getAIModels() {
      const { data } = await axiosInstance.get('/admin/ai-engine/models');
      return data.data || data;
    },
    // Business Intelligence
    async getBIKPIs(period = 'month') {
      const { data } = await axiosInstance.get(`/admin/business-intelligence/kpis?period=${period}`);
      return data.data || data;
    },
    async getUserGrowth(months = 12) {
      const { data } = await axiosInstance.get(`/admin/business-intelligence/user-growth?months=${months}`);
      return data.data || data;
    },
    async getRevenueByService(period = 'month') {
      const { data } = await axiosInstance.get(`/admin/business-intelligence/revenue-by-service?period=${period}`);
      return data.data || data;
    },
    async getBIInsights(limit = 10) {
      const { data } = await axiosInstance.get(`/admin/business-intelligence/insights?limit=${limit}`);
      return data.data || data;
    },
    // Admin notifications (AdminNotification)
    async getNotifications(params = {}) {
      const { data } = await axiosInstance.get('/admin/notifications', {
        params: { sort: params.sort ?? '-created_date', limit: params.limit ?? 50 },
      });
      return data.data ?? (Array.isArray(data) ? data : []);
    },
    async updateNotification(id, body) {
      const { data } = await axiosInstance.patch(`/admin/notifications/${id}`, body);
      return data.data ?? data;
    },
    async deleteNotification(id) {
      await axiosInstance.delete(`/admin/notifications/${id}`);
    },
    // Admin payments (PaymentRecord)
    async getPayments(params = {}) {
      const { data } = await axiosInstance.get('/admin/payments', { params });
      return data.data ?? (Array.isArray(data) ? data : []);
    },
    async updatePayment(id, body) {
      const { data } = await axiosInstance.patch(`/admin/payments/${id}`, body);
      return data.data ?? data;
    },
    // Admin subscription plans (SubscriptionPlan)
    async getSubscriptionPlans() {
      const { data } = await axiosInstance.get('/admin/subscription-plans');
      return data.data ?? (Array.isArray(data) ? data : []);
    },
    async createSubscriptionPlan(body) {
      const { data } = await axiosInstance.post('/admin/subscription-plans', body);
      return data.data ?? data;
    },
    async updateSubscriptionPlan(id, body) {
      const { data } = await axiosInstance.patch(`/admin/subscription-plans/${id}`, body);
      return data.data ?? data;
    },
    async deleteSubscriptionPlan(id) {
      await axiosInstance.delete(`/admin/subscription-plans/${id}`);
    },
  },
  microcredit: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/microcredit', { params: { page: params.page || 1, limit: params.limit || 20, status: params.status } });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/microcredit/${id}`);
      return data.data;
    },
    async createRequest(body) {
      const { data } = await axiosInstance.post('/microcredit/request', {
        amount: body.amount ?? body.amount_requested,
        purpose: body.purpose,
        repaymentPeriod: body.repaymentPeriod ?? body.repayment_period_months,
        interestRate: body.interestRate ?? body.interest_rate,
        business_plan: body.business_plan,
      });
      return data.data;
    },
    async contribute(loanId, { amount, phone }) {
      const { data } = await axiosInstance.post(`/microcredit/${loanId}/contribute`, { amount, phone });
      return data.data;
    },
  },
  crowdfunding: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/crowdfunding', { params: { page: params.page || 1, limit: params.limit || 20, status: params.status, search: params.search } });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/crowdfunding/${id}`);
      return data.data;
    },
    async create(body) {
      const { data } = await axiosInstance.post('/crowdfunding', {
        title: body.title,
        description: body.description,
        goalAmount: body.goalAmount ?? body.goal_amount,
        endDate: body.endDate ?? body.end_date,
        status: body.status ?? 'pending',
      });
      return data.data;
    },
    async contribute(campaignId, { amount, phone, rewardTier }) {
      const { data } = await axiosInstance.post(`/crowdfunding/${campaignId}/contribute`, { amount, phone, rewardTier });
      return data.data;
    },
  },
  refunds: {
    async request(orderId, payload) {
      const { data } = await axiosInstance.post(`/refunds/orders/${orderId}/refund`, payload);
      return data.data;
    },
    async listMy() {
      const { data } = await axiosInstance.get('/refunds/my');
      return data.data;
    },
    async process(id, approve) {
      const { data } = await axiosInstance.post(`/refunds/${id}/process`, { approve });
      return data.data;
    },
    async listAll(params = {}) {
      const { data } = await axiosInstance.get('/refunds/admin', { params });
      return data.data;
    },
  },
  returns: {
    async request(orderId, payload) {
      const { data } = await axiosInstance.post(`/returns/${orderId}`, payload);
      return data.data;
    },
    async list(scope = 'buyer') {
      const { data } = await axiosInstance.get('/returns', { params: { scope } });
      return data.data;
    },
    async getById(returnId) {
      const { data } = await axiosInstance.get(`/returns/${returnId}`);
      return data.data;
    },
    async updateStatus(returnId, payload) {
      const { data } = await axiosInstance.put(`/returns/${returnId}/status`, payload);
      return data.data;
    },
  },
  addresses: {
    async list() {
      const { data } = await axiosInstance.get('/addresses');
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/addresses', payload);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.put(`/addresses/${id}`, payload);
      return data.data;
    },
    async delete(id) {
      const { data } = await axiosInstance.delete(`/addresses/${id}`);
      return data.data;
    },
  },
  reviews: {
    async listByProduct(productId, params = {}) {
      const { data } = await axiosInstance.get(`/reviews/product/${productId}`, { params });
      return data.data;
    },
    async create(productId, payload) {
      const { data } = await axiosInstance.post('/reviews', { productId, ...payload });
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.put(`/reviews/${id}`, payload);
      return data.data;
    },
    async delete(id) {
      const { data } = await axiosInstance.delete(`/reviews/${id}`);
      return data.data;
    },
    async markHelpful(id) {
      const { data } = await axiosInstance.post(`/reviews/${id}/helpful`);
      return data.data;
    },
    async reply(id, content) {
      const { data } = await axiosInstance.post(`/reviews/${id}/reply`, { content });
      return data.data;
    },
  },
  disputes: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/disputes', { params });
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/disputes', payload);
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/disputes/${id}`);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.patch(`/disputes/${id}`, payload);
      return data.data;
    },
    async addMessage(id, messageData) {
      const { data } = await axiosInstance.post(`/disputes/${id}/messages`, messageData);
      return data.data;
    },
    async resolve(id, resolutionData) {
      const { data } = await axiosInstance.post(`/disputes/${id}/resolve`, resolutionData);
      return data.data;
    },
  },
  orders: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/orders', { params });
      return data.data;
    },
    async getConfig() {
      const { data } = await axiosInstance.get('/orders/config');
      return data.data;
    },
    async getStats() {
      const { data } = await axiosInstance.get('/orders/stats');
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/orders/${id}`);
      return data.data;
    },
    async downloadInvoice(id) {
      const res = await axiosInstance.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      return res.data;
    },
    async create(orderData) {
      const { data } = await axiosInstance.post('/orders', orderData);
      return data.data;
    },
    async updateStatus(id, status) {
      const { data } = await axiosInstance.patch(`/orders/${id}/status`, { status });
      return data.data;
    },
    async cancel(id) {
      const { data } = await axiosInstance.post(`/orders/${id}/cancel`);
      return data.data;
    },
    async confirmReception(id) {
      const { data } = await axiosInstance.post(`/orders/${id}/confirm-reception`);
      return data.data;
    },
    async confirmPayment(id) {
      const { data } = await axiosInstance.post(`/orders/${id}/confirm-payment`);
      return data.data;
    },
  },
  seller: {
    async getAnalytics(params = {}) {
      const { data } = await axiosInstance.get('/seller/analytics', { params });
      return data.data;
    },
    async getProductAnalytics(params = {}) {
      const { data } = await axiosInstance.get('/seller/analytics/products', { params });
      return data.data;
    },
    async getInsights(params = {}) {
      const { data } = await axiosInstance.get('/seller/analytics/insights', { params });
      return data.data;
    },
    async getGeography(params = {}) {
      const { data } = await axiosInstance.get('/seller/analytics/geography', { params });
      return data.data;
    },
    async exportCsv(params = {}) {
      const res = await axiosInstance.get('/seller/analytics/export', { params, responseType: 'blob' });
      return res.data;
    },
    // CPO 10.21 — Programme fidélité
    getLoyalty() {
      return axiosInstance.get('/seller/loyalty').then(({ data }) => data.data);
    },
    updateLoyalty(payload) {
      return axiosInstance.put('/seller/loyalty', payload).then(({ data }) => data.data);
    },
    getOffers(params = {}) {
      return axiosInstance.get('/seller/offers', { params }).then(({ data }) => ({ offers: data.data || [], pagination: data.pagination }));
    },
    respondToOffer(offerId, { status, seller_note }) {
      return axiosInstance.patch(`/seller/offers/${offerId}`, { status, seller_note }).then(({ data }) => data.data);
    },
    // CPO 6.35 — Enchères du vendeur
    getAuctions(params = {}) {
      return axiosInstance.get('/seller/auctions', { params }).then(({ data }) => ({ auctions: data.data || [], pagination: data.pagination }));
    },
  },
  loyalty: {
    getMe() {
      return axiosInstance.get('/loyalty/me').then(({ data }) => data.data || []);
    },
    getBySeller(sellerId) {
      return axiosInstance.get(`/loyalty/seller/${sellerId}`).then(({ data }) => data.data);
    },
    getMyPointsWithSeller(sellerId) {
      return axiosInstance.get(`/loyalty/me/seller/${sellerId}`).then(({ data }) => data.data);
    },
  },
  creators: {
    async getMe() {
      const { data } = await axiosInstance.get('/creators/me');
      return data.data;
    },
  },
  events: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/events', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/events/${id}`);
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/events', payload);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.patch(`/events/${id}`, payload);
      return data.data;
    },
    async book(eventId, payload) {
      const { data } = await axiosInstance.post(`/events/${eventId}/book`, payload);
      return data.data;
    },
    // Admin methods
    async getPending() {
      const { data } = await axiosInstance.get('/events/admin/pending');
      return data.data || [];
    },
    async approve(eventId) {
      const { data } = await axiosInstance.post(`/events/${eventId}/approve`);
      return data.data;
    },
    async reject(eventId, reason) {
      const { data } = await axiosInstance.post(`/events/${eventId}/reject`, { reason });
      return data.data;
    },
    async confirmPayment(paymentId, body = {}) {
      const { data } = await axiosInstance.post(`/events/payments/${paymentId}/confirm`, body);
      return data.data;
    },
    async checkIn(qrCode) {
      const { data } = await axiosInstance.post('/events/check-in', { qr_code: qrCode });
      return data.data;
    },
    async getMyTickets() {
      const { data } = await axiosInstance.get('/events/my-tickets');
      return data.data;
    },
    async getDashboard(eventId) {
      const { data } = await axiosInstance.get(`/events/${eventId}/dashboard`);
      return data.data;
    },
    async like(eventId) {
      const { data } = await axiosInstance.post(`/events/${eventId}/like`);
      return data.data;
    },
    async getComments(eventId, params = {}) {
      const { data } = await axiosInstance.get(`/events/${eventId}/comments`, { params });
      return data.data;
    },
    async addComment(eventId, content) {
      const { data } = await axiosInstance.post(`/events/${eventId}/comments`, { content });
      return data.data;
    },
    async cancelTicket(ticketId) {
      const { data } = await axiosInstance.post(`/events/tickets/${ticketId}/cancel`);
      return data.data;
    },
    async exportParticipantsCsv(eventId) {
      const res = await axiosInstance.get(`/events/${eventId}/participants/export`, { responseType: 'blob' });
      return res.data;
    },
    async notifyParticipants(eventId, message) {
      const { data } = await axiosInstance.post(`/events/${eventId}/notify-participants`, { message });
      return data.data;
    },
    async closeEvent(eventId) {
      const { data } = await axiosInstance.post(`/events/${eventId}/close`);
      return data.data;
    },
    async downloadTicketPdf(ticketId) {
      const res = await axiosInstance.get(`/events/tickets/${ticketId}/pdf`, { responseType: 'blob' });
      return res.data;
    },
    async payForFeature(eventId, payload = {}) {
      const { data } = await axiosInstance.post(`/events/${eventId}/feature`, payload);
      return data.data;
    },
    async confirmFeaturePayment(featurePaymentId, body = {}) {
      const { data } = await axiosInstance.post(`/events/feature-payments/${featurePaymentId}/confirm`, body);
      return data.data;
    },
    async getAnalytics(eventId) {
      const { data } = await axiosInstance.get(`/events/${eventId}/analytics`);
      return data.data;
    },
    async getFriendsAttending(eventId) {
      const { data } = await axiosInstance.get(`/events/${eventId}/friends-attending`);
      return data.data;
    },
    async getChat(eventId, params = {}) {
      const { data } = await axiosInstance.get(`/events/${eventId}/chat`, { params });
      return data.data;
    },
    async addChatMessage(eventId, content) {
      const { data } = await axiosInstance.post(`/events/${eventId}/chat`, { content });
      return data.data;
    },
  },
  shipments: {
    async create(shipmentData) {
      const { data } = await axiosInstance.post('/shipments', shipmentData);
      return data.data;
    },
    async getTimeline(orderId) {
      const { data } = await axiosInstance.get(`/shipments/${orderId}/timeline`);
      return data.data;
    },
    async addTrackingEvent(orderId, eventData) {
      const { data } = await axiosInstance.post(`/shipments/${orderId}/tracking`, eventData);
      return data.data;
    },
    async confirmDelivery(orderId, deliveryData) {
      const { data } = await axiosInstance.post(`/shipments/${orderId}/confirm-delivery`, deliveryData);
      return data.data;
    },
    async updateLocation(orderId, location) {
      const { data } = await axiosInstance.put(`/shipments/${orderId}/location`, { location });
      return data.data;
    },
  },
  orderReviews: {
    async create(reviewData) {
      const { data } = await axiosInstance.post('/order-reviews', reviewData);
      return data.data;
    },
    async getProductReviews(productId, params = {}) {
      const { data } = await axiosInstance.get(`/order-reviews/products/${productId}`, { params });
      return data.data;
    },
    async getOrderReviews(orderId) {
      const { data } = await axiosInstance.get(`/order-reviews/orders/${orderId}`);
      return data.data;
    },
    async reply(reviewId, reply) {
      const { data } = await axiosInstance.patch(`/order-reviews/${reviewId}/reply`, { reply });
      return data.data;
    },
    async report(reviewId, reason) {
      const { data } = await axiosInstance.post(`/order-reviews/${reviewId}/report`, { reason });
      return data.data;
    },
    async rateBuyer(orderId, { rating, content }) {
      const { data } = await axiosInstance.post(`/order-reviews/orders/${orderId}/rate-buyer`, { rating, content });
      return data.data;
    },
  },
  payments: {
    async createStripeCheckout(orderId, items, successUrl, cancelUrl) {
      const { data } = await axiosInstance.post('/payments/stripe/checkout', {
        orderId, items, successUrl, cancelUrl
      });
      return data.data;
    },
    async verifyStripePayment(sessionId) {
      const { data } = await axiosInstance.get('/payments/stripe/verify', { params: { sessionId } });
      return data.data;
    },
    async initiateOrangeMoney(orderId, amount, phone, returnUrl, idempotencyKey) {
      const idemKey = (idempotencyKey && idempotencyKey.length >= 8)
        ? idempotencyKey
        : `om-${orderId}-${Date.now()}`;
      const { data } = await axiosInstance.post('/payments/orange-money', {
        orderId, amount, phone, returnUrl
      }, { headers: { 'Idempotency-Key': idemKey } });
      return data.data;
    },
    async verifyOrangeMoney(orderId, status, payToken) {
      const { data } = await axiosInstance.post('/payments/orange-money/verify', {
        orderId, status, payToken
      });
      return data.data;
    },
    async initiateMoovMoney(orderId, amount, phone, returnUrl) {
      const { data } = await axiosInstance.post('/payments/moov', {
        orderId, amount, phone, returnUrl
      });
      return data.data;
    },
    async initiateWavePayment(orderId, amount, returnUrl, currency = 'XOF') {
      const { data } = await axiosInstance.post('/payments/wave', {
        orderId, amount, returnUrl, currency
      });
      return data.data;
    },
    async getUssdInstructions(provider = 'orange_money', country = 'ML', amount) {
      const params = { provider, country };
      if (Number.isFinite(Number(amount)) && Number(amount) > 0) {
        params.amount = Number(amount);
      }
      const { data } = await axiosInstance.get('/payments/ussd/instructions', { params });
      return data.data;
    },
    async getWallet() {
      const { data } = await axiosInstance.get('/payments/wallet');
      return data.data;
    },
    async addToWallet(amount, description) {
      const { data } = await axiosInstance.post('/payments/wallet/deposit', { amount, description });
      return data.data;
    },
    async withdrawFromWallet(amount, description, options = {}) {
      const { data } = await axiosInstance.post('/payments/wallet/withdraw', { amount, description, pin: options.pin });
      return data.data;
    },
    async payOrderWithWallet(orderId, pin) {
      const { data } = await axiosInstance.post('/payments/wallet/pay-order', { orderId, pin });
      return data.data;
    },
    async getWalletSecurity() {
      const { data } = await axiosInstance.get('/payments/wallet/security');
      return data.data;
    },
    async setWalletPin(pin) {
      const { data } = await axiosInstance.post('/payments/wallet/set-pin', { pin });
      return data.data;
    },
    async validateWalletPin(pin) {
      const { data } = await axiosInstance.post('/payments/wallet/validate-pin', { pin });
      return data.data;
    },
    async getTransactions(params = {}) {
      const { data } = await axiosInstance.get('/payments/transactions', { params });
      return data.data;
    },
  },
  withdrawals: {
    async request(amount, phoneOrOrange, options = {}) {
      const isPayPal = options.payment_method === 'paypal';
      const payload = {
        amount,
        orange_money_phone: isPayPal ? undefined : phoneOrOrange,
        phone: isPayPal ? undefined : phoneOrOrange,
        payment_method: options.payment_method || 'orange_money',
        paypal_email: options.paypal_email,
        pin: options.pin,
      };
      const { data } = await axiosInstance.post('/withdrawals/request', payload);
      return data.data;
    },
    async list(params = {}) {
      const { data } = await axiosInstance.get('/withdrawals', { params });
      return data.data;
    },
    async getPending(params = {}) {
      const { data } = await axiosInstance.get('/withdrawals/pending', { params });
      return data.data;
    },
    async process(id, payload = {}) {
      const { data } = await axiosInstance.post(`/withdrawals/${id}/process`, payload);
      return data.data;
    },
    async cancel(id) {
      const { data } = await axiosInstance.post(`/withdrawals/${id}/cancel`);
      return data.data;
    },
  },
  upload: {
    async presign({ kind, filename, contentType }) {
      const { data } = await axiosInstance.post('/upload/presign', { kind, filename, contentType });
      return data?.data ?? data;
    },
    async image(input) {
      const file = input?.file ?? input;
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error('Fichier image invalide');
      }
      try {
        if (file.size && file.size >= getDirectUploadThresholdBytes()) {
          const blob = file instanceof File ? file : new File([file], 'image', { type: file.type || 'image/jpeg' });
          const presigned = await api.upload.presign({
            kind: 'image',
            filename: blob.name || 'image',
            contentType: blob.type || 'image/jpeg',
          });
          if (presigned?.uploadUrl && presigned?.file_url) {
            await putToPresignedUrl(presigned.uploadUrl, blob, blob.type);
            return { file_url: presigned.file_url, original_name: blob.name };
          }
        }
      } catch (_) {
        // fallback
      }
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post('/upload/image', formData, uploadConfig());
      const result = data?.data ?? data;
      return result?.file_url != null ? result : { file_url: result?.file_url ?? result?.url };
    },
    async video(input, onProgress) {
      const file = input?.file ?? input;
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error('Fichier vidéo invalide');
      }
      try {
        const blob = file instanceof File ? file : new File([file], 'video.mp4', { type: file.type || 'video/mp4' });
        const videoCt = normalizeClientVideoContentType(blob);
        if (file.size && file.size >= getMultipartThresholdBytes()) {
          const out = await uploadVideoMultipartR2(blob, videoCt, onProgress);
          if (out?.file_url) {
            onProgress?.(100);
            return { file_url: out.file_url, original_name: blob.name };
          }
        }
        if (file.size && file.size >= getDirectUploadThresholdBytes()) {
          const presigned = await api.upload.presign({
            kind: 'video',
            filename: blob.name || 'video.mp4',
            contentType: videoCt,
          });
          if (presigned?.uploadUrl && presigned?.file_url) {
            await putToPresignedUrl(presigned.uploadUrl, blob, videoCt, onProgress);
            return { file_url: presigned.file_url, original_name: blob.name };
          }
        }
      } catch (_) {
        // fallback
      }
      const formData = new FormData();
      const blob = file instanceof File ? file : new File([file], 'video.mp4', { type: file.type || 'video/mp4' });
      formData.append('file', blob);
      const { data } = await axiosInstance.post('/upload/video', formData, {
        ...uploadConfig(),
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const pct = Math.min(100, Math.round((progressEvent.loaded * 100) / total));
          onProgress?.(pct);
        },
      });
      const result = data?.data ?? data;
      const fileUrl = result?.file_url ?? result?.url;
      if (fileUrl == null && import.meta.env.DEV) {
        console.warn('[upload.video] Réponse sans file_url:', { data, result });
      }
      return fileUrl != null ? { file_url: fileUrl } : (result || {});
    },
    async audio(input, onProgress) {
      const file = input?.file ?? input;
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error('Fichier audio invalide');
      }
      try {
        if (file.size && file.size >= getDirectUploadThresholdBytes()) {
          const blob = file instanceof File
            ? file
            : new File([file], 'audio.webm', { type: file.type || 'audio/webm' });
          const presigned = await api.upload.presign({
            kind: 'audio',
            filename: blob.name || 'audio.webm',
            contentType: blob.type || 'audio/webm',
          });
          if (presigned?.uploadUrl && presigned?.file_url) {
            await putToPresignedUrl(presigned.uploadUrl, blob, blob.type, onProgress);
            return { file_url: presigned.file_url, original_name: blob.name };
          }
        }
      } catch (_) {
        // fallback
      }
      const formData = new FormData();
      const blob = file instanceof File
        ? file
        : new File([file], 'audio.webm', { type: file.type || 'audio/webm' });
      formData.append('file', blob);
      const { data } = await axiosInstance.post('/upload/audio', formData, {
        ...uploadConfig(),
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const pct = Math.min(100, Math.round((progressEvent.loaded * 100) / total));
          onProgress?.(pct);
        },
      });
      const result = data?.data ?? data;
      const fileUrl = result?.file_url ?? result?.url;
      return fileUrl != null ? { file_url: fileUrl } : (result || {});
    },
    async document(input) {
      const file = input?.file ?? input;
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error('Fichier document invalide');
      }
      try {
        if (file.size && file.size >= getDirectUploadThresholdBytes()) {
          const blob =
            file instanceof File ? file : new File([file], 'document', { type: file.type || 'application/octet-stream' });
          const presigned = await api.upload.presign({
            kind: 'document',
            filename: blob.name || 'document',
            contentType: blob.type || 'application/octet-stream',
          });
          if (presigned?.uploadUrl && presigned?.file_url) {
            await putToPresignedUrl(presigned.uploadUrl, blob, blob.type || 'application/octet-stream');
            return { file_url: presigned.file_url, original_name: blob.name };
          }
        }
      } catch (_) {
        // fallback
      }
      const formData = new FormData();
      const blob =
        file instanceof File ? file : new File([file], 'document', { type: file.type || 'application/octet-stream' });
      formData.append('file', blob);
      const { data } = await axiosInstance.post('/upload/document', formData, {
        ...uploadConfig(),
        timeout: UPLOAD_TIMEOUT_MS,
      });
      const result = data?.data ?? data;
      const fileUrl = result?.file_url ?? result?.url;
      return fileUrl != null
        ? { file_url: fileUrl, original_name: result?.original_name }
        : (result || {});
    },
  },
  saves: {
    async toggle(videoId) {
      const { data } = await axiosInstance.post('/saves', { video_id: videoId });
      return data.data;
    },
    async list(params = {}) {
      // Utiliser la pagination, si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
      const requestParams = {
        page: params.page || 1,
        limit: params.limit !== undefined ? params.limit : 0,
        ...params
      };
      const { data } = await axiosInstance.get('/saves', { params: requestParams });
      return data.data;
    },
  },
  notifications: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/notifications', { params });
      return data.data;
    },
    async getPreferences() {
      const { data } = await axiosInstance.get('/notifications/preferences');
      return data.data;
    },
    async updatePreferences(payload = {}) {
      const { data } = await axiosInstance.put('/notifications/preferences', payload);
      return data.data;
    },
    async subscribePush(payload = {}) {
      const { data } = await axiosInstance.post('/notifications/push/subscribe', payload);
      return data.data;
    },
    async unsubscribePush(endpoint) {
      const { data } = await axiosInstance.delete('/notifications/push/unsubscribe', { data: { endpoint } });
      return data?.data;
    },
    async markAsRead(id) {
      await axiosInstance.put(`/notifications/${id}/read`);
    },
    async markAllAsRead() {
      await axiosInstance.put('/notifications/read-all');
    },
  },
  stories: {
    async list(userIds = null) {
      const params = userIds ? { userIds: Array.isArray(userIds) ? userIds.join(',') : userIds } : {};
      const { data } = await axiosInstance.get('/stories', { params });
      return data.data ?? [];
    },
    async getByUser(userId) {
      const { data } = await axiosInstance.get(`/stories/user/${userId}`);
      return data.data ?? [];
    },
    async create({ mediaUrl, mediaType, expiresInHours, poll }) {
      const { data } = await axiosInstance.post('/stories', { mediaUrl, mediaType, expiresInHours, poll });
      return data.data;
    },
    async view(storyId) {
      const { data } = await axiosInstance.post(`/stories/${storyId}/view`);
      return data.data;
    },
    async delete(storyId) {
      const { data } = await axiosInstance.delete(`/stories/${storyId}`);
      return data.data;
    },
    async addReaction(storyId, emoji = '❤️') {
      const { data } = await axiosInstance.post(`/stories/${storyId}/reactions`, { emoji });
      return data.data;
    },
    async removeReaction(storyId) {
      const { data } = await axiosInstance.delete(`/stories/${storyId}/reactions`);
      return data.data;
    },
    async getReactions(storyId) {
      const { data } = await axiosInstance.get(`/stories/${storyId}/reactions`);
      return data.data ?? [];
    },
    async votePoll(pollId, optionIndex) {
      const { data } = await axiosInstance.post(`/stories/polls/${pollId}/vote`, { optionIndex });
      return data.data;
    },
    async getPollResults(pollId) {
      const { data } = await axiosInstance.get(`/stories/polls/${pollId}/results`);
      return data.data;
    },
  },
  communities: {
    async list({ page = 1, limit = 20, filters = {} } = {}) {
      const params = {
        page,
        limit,
        ...(filters || {}),
      };
      const { data } = await axiosInstance.get('/communities', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/communities/${encodeURIComponent(id)}`);
      return data.data;
    },
    async join(id) {
      const { data } = await axiosInstance.post(`/communities/${encodeURIComponent(id)}/join`);
      return data.data;
    },
    async leave(id) {
      const { data } = await axiosInstance.post(`/communities/${encodeURIComponent(id)}/leave`);
      return data.data;
    },
  },
  groupCalls: {
    async create(body = {}) {
      const { data } = await axiosInstance.post('/group-calls', body);
      return data.data;
    },
    async getById(callId) {
      const { data } = await axiosInstance.get(`/group-calls/id/${encodeURIComponent(callId)}`);
      return data.data;
    },
    async getToken(callId) {
      const { data } = await axiosInstance.get(`/group-calls/id/${encodeURIComponent(callId)}/token`);
      return data.data;
    },
    async getByRoomId(roomId) {
      const { data } = await axiosInstance.get(`/group-calls/room/${encodeURIComponent(roomId)}`);
      return data.data;
    },
    async join(callId) {
      const { data } = await axiosInstance.post(`/group-calls/${encodeURIComponent(callId)}/join`);
      return data.data;
    },
    async leave(callId) {
      const { data } = await axiosInstance.post(`/group-calls/${encodeURIComponent(callId)}/leave`);
      return data.data;
    },
  },
  miniApps: {
    async get(id) {
      const { data } = await axiosInstance.get(`/mini-apps/${id}`);
      return data.data;
    },
    async getReviews(id, page = 1, limit = 20) {
      const { data } = await axiosInstance.get(`/mini-apps/${id}/reviews`, { params: { page, limit } });
      return data.data;
    },
    async getMyReview(id) {
      const { data } = await axiosInstance.get(`/mini-apps/${id}/reviews/me`);
      return data.data;
    },
    async submitReview(id, rating, comment) {
      const { data } = await axiosInstance.post(`/mini-apps/${id}/reviews`, { rating, comment });
      return data.data;
    },
  },
  messages: {
    async getConversations(page = 1, limit = 20, includeArchived = false) {
      const params = { page, limit };
      if (includeArchived) params.includeArchived = 'true';
      const { data } = await axiosInstance.get('/messages/conversations', { params });
      return data.data;
    },
    async listScheduledMessages() {
      const { data } = await axiosInstance.get('/messages/scheduled');
      return data.data;
    },
    async getConversation(userId) {
      const { data } = await axiosInstance.get(`/messages/conversation/${userId}`);
      return data.data;
    },
    async getConversationById(conversationId) {
      const { data } = await axiosInstance.get(`/messages/conversations/id/${conversationId}`);
      return data.data;
    },
    async getMessages(conversationId, cursor = null, limit = 30) {
      const params = { limit };
      if (cursor) params.cursor = cursor;
      const { data } = await axiosInstance.get(`/messages/${conversationId}`, { params });
      return data.data;
    },
    async send(recipientId, content, options = {}) {
      const { data } = await axiosInstance.post('/messages/send', {
        recipientId,
        content: content ?? '',
        type: options.type || 'text',
        media_url: options.media_url,
        thumbnail_url: options.thumbnail_url,
        reply_to_message_id: options.reply_to_message_id,
        scheduled_at: options.scheduled_at || undefined,
        // true explicite uniquement (évite toute coercition truthy/falsy ambiguë pour la vue unique)
        is_ephemeral: options.is_ephemeral === true ? true : undefined,
        expires_at: options.expires_at || undefined,
        location_lat: options.location_lat,
        location_lng: options.location_lng,
        location_label: options.location_label,
        contact_user_id: options.contact_user_id,
        contact_name: options.contact_name,
        sticker_url: options.sticker_url,
        poll_options: options.poll_options,
        event_id: options.event_id,
        e2ee_envelope: options.e2ee_envelope || undefined,
      });
      return data.data;
    },
    async voteDmPoll(messageId, optionIndex) {
      const { data } = await axiosInstance.post(`/messages/message/${messageId}/poll-vote`, {
        option_index: optionIndex,
      });
      return data.data;
    },
    async getDraft(conversationId) {
      const { data } = await axiosInstance.get(`/messages/conversations/${conversationId}/draft`);
      return data.data;
    },
    async putDraft(conversationId, content) {
      const { data } = await axiosInstance.put(`/messages/conversations/${conversationId}/draft`, { content: content ?? '' });
      return data.data;
    },
    async archiveConversation(conversationId, archived) {
      const { data } = await axiosInstance.patch(`/messages/conversations/${conversationId}/archive`, { archived: !!archived });
      return data.data;
    },
    async exportConversations(conversationId) {
      const { data } = await axiosInstance.get('/messages/export', {
        params: conversationId ? { conversationId } : {},
      });
      return data.data;
    },
    async markAsDelivered(conversationId) {
      const { data } = await axiosInstance.put(`/messages/${conversationId}/delivered`);
      return data.data;
    },
    async markAsRead(conversationId) {
      const { data } = await axiosInstance.put(`/messages/${conversationId}/read`);
      return data.data;
    },
    async getUnreadCount() {
      const { data } = await axiosInstance.get('/messages/unread/count');
      return data.data;
    },
    async getPresence(userId) {
      const { data } = await axiosInstance.get(`/messages/presence/${userId}`);
      return data.data;
    },
    async searchInConversation(conversationId, q) {
      const { data } = await axiosInstance.get(`/messages/${conversationId}/search`, { params: { q } });
      return data.data;
    },
    async getStarredMessages() {
      const { data } = await axiosInstance.get('/messages/starred');
      return data.data;
    },
    async deleteMessage(messageId) {
      const { data } = await axiosInstance.delete(`/messages/message/${messageId}`);
      return data.data;
    },
    /** CPO 4.17 — Suppression pour tous (< 15 min, expéditeur uniquement) */
    async deleteForAll(messageId) {
      const { data } = await axiosInstance.post(`/messages/message/${messageId}/delete-for-all`);
      return data.data;
    },
    /** CPO 4.23 — Épingler un message en tête de conversation */
    async pinMessage(conversationId, messageId) {
      const { data } = await axiosInstance.post(`/messages/conversations/${conversationId}/pin`, { messageId });
      return data.data;
    },
    /** CPO 4.23 — Désépingler */
    async unpinMessage(conversationId) {
      const { data } = await axiosInstance.delete(`/messages/conversations/${conversationId}/pin`);
      return data.data;
    },
    async updateMessageMeta(messageId, payload = {}) {
      const { data } = await axiosInstance.patch(`/messages/message/${messageId}/meta`, payload);
      return data.data;
    },
    async editMessageContent(messageId, content) {
      const { data } = await axiosInstance.patch(`/messages/message/${messageId}/content`, { content: content ?? '' });
      return data.data;
    },
    async setReaction(messageId, emoji) {
      const { data } = await axiosInstance.post(`/messages/message/${messageId}/reaction`, { emoji });
      return data.data;
    },
    async clearReaction(messageId) {
      const { data } = await axiosInstance.delete(`/messages/message/${messageId}/reaction`);
      return data.data;
    },
    async getMessageReactionsDetail(messageId) {
      const { data } = await axiosInstance.get(`/messages/message/${messageId}/reactions-detail`);
      return data.data;
    },
    async transcribeVoiceMessage(messageId) {
      const { data } = await axiosInstance.post(`/messages/message/${messageId}/transcribe`);
      return data.data;
    },
    /** Mute / unmute notifications pour une conversation (CPO 4.39) */
    async setConversationNotifications(conversationId, { muted }) {
      const { data } = await axiosInstance.patch(`/messages/conversations/${conversationId}/notifications`, { muted: !!muted });
      return data.data;
    },
    /** Effacer le contenu de la discussion pour l’utilisateur connecté (les messages restent chez l’autre). */
    async clearConversationForMe(conversationId) {
      const { data } = await axiosInstance.post(`/messages/conversations/${conversationId}/clear-me`);
      return data.data;
    },
    async block(userId) {
      const { data } = await axiosInstance.post('/messages/block', { userId });
      return data.data;
    },
    async report(messageId, reason) {
      const { data } = await axiosInstance.post('/messages/report', { messageId, reason });
      return data.data;
    },
    // Group messaging (CDC)
    async createGroup(name, memberIds = []) {
      const { data } = await axiosInstance.post('/messages/groups', { name: name || 'Groupe', memberIds });
      return data.data;
    },
    async getGroups(page = 1, limit = 50) {
      const { data } = await axiosInstance.get('/messages/groups', { params: { page, limit } });
      return data.data;
    },
    async exportAllGroupConversations() {
      const { data } = await axiosInstance.get('/messages/groups/export');
      return data.data;
    },
    async getGroup(groupId) {
      const { data } = await axiosInstance.get(`/messages/group/${groupId}`);
      return data.data;
    },
    async updateGroup(groupId, body = {}) {
      const { data } = await axiosInstance.patch(`/messages/group/${groupId}`, body);
      return data.data;
    },
    async setGroupNotificationsMuted(groupId, muted) {
      const { data } = await axiosInstance.patch(`/messages/group/${groupId}/notifications`, {
        muted: !!muted,
      });
      return data.data;
    },
    async setMyGroupDisplayTag(groupId, group_display_tag) {
      const { data } = await axiosInstance.patch(`/messages/group/${groupId}/me/display-tag`, {
        group_display_tag: group_display_tag == null || group_display_tag === '' ? null : String(group_display_tag),
      });
      return data.data;
    },
    async getGroupMessages(groupId, cursor = null, limit = 30) {
      const params = { limit };
      if (cursor) params.cursor = cursor;
      const { data } = await axiosInstance.get(`/messages/group/${groupId}/messages`, { params });
      return data.data;
    },
    async exportGroupMessages(groupId) {
      const { data } = await axiosInstance.get(`/messages/group/${groupId}/export`);
      return data.data;
    },
    async markGroupRead(groupId) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/read`);
      return data.data;
    },
    async pinGroupMessage(groupId, messageId) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/pin`, { messageId });
      return data.data;
    },
    async unpinGroupMessage(groupId) {
      const { data } = await axiosInstance.delete(`/messages/group/${groupId}/pin`);
      return data.data;
    },
    async sendGroupMessage(groupId, content, options = {}) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/send`, {
        content: content ?? '',
        type: options.type || 'text',
        media_url: options.media_url,
        thumbnail_url: options.thumbnail_url,
        reply_to_id: options.reply_to_id,
        poll_options: options.poll_options,
        event_id: options.event_id,
        scheduled_at: options.scheduled_at || undefined,
        forward_from_message_id: options.forward_from_message_id || undefined,
        e2ee_envelope: options.e2ee_envelope || undefined,
        e2ee_envelopes: options.e2ee_envelopes || undefined,
      });
      return data.data;
    },
    async voteGroupPoll(groupId, messageId, optionIndex) {
      const { data } = await axiosInstance.post(
        `/messages/group/${groupId}/messages/${messageId}/poll-vote`,
        { option_index: optionIndex }
      );
      return data.data;
    },
    async setGroupReaction(groupId, messageId, emoji) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/messages/${messageId}/reaction`, {
        emoji,
      });
      return data.data;
    },
    async clearGroupReaction(groupId, messageId) {
      const { data } = await axiosInstance.delete(`/messages/group/${groupId}/messages/${messageId}/reaction`);
      return data.data;
    },
    async getGroupMessageReactionsDetail(groupId, messageId) {
      const { data } = await axiosInstance.get(`/messages/group/${groupId}/messages/${messageId}/reactions-detail`);
      return data.data;
    },
    async transcribeGroupVoiceMessage(groupId, messageId) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/messages/${messageId}/transcribe`);
      return data.data;
    },
    async editGroupMessage(groupId, messageId, content) {
      const { data } = await axiosInstance.patch(`/messages/group/${groupId}/messages/${messageId}`, { content });
      return data.data;
    },
    async deleteGroupMessage(groupId, messageId) {
      const { data } = await axiosInstance.delete(`/messages/group/${groupId}/messages/${messageId}`);
      return data.data;
    },
    async addGroupMembers(groupId, userIds) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/members`, {
        userIds: Array.isArray(userIds) ? userIds : [userIds],
      });
      return data.data;
    },
    async removeGroupMember(groupId, userId) {
      const { data } = await axiosInstance.delete(`/messages/group/${groupId}/members/${userId}`);
      return data.data;
    },
    async setGroupMemberRole(groupId, userId, role) {
      const { data } = await axiosInstance.patch(`/messages/group/${groupId}/members/${userId}/role`, { role });
      return data.data;
    },
    async leaveGroup(groupId) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/leave`);
      return data.data;
    },
    async generateGroupInviteLink(groupId) {
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/invite-link`);
      return data.data;
    },
    async revokeGroupInviteLink(groupId) {
      const { data } = await axiosInstance.delete(`/messages/group/${groupId}/invite-link`);
      return data.data;
    },
    async joinGroupByInviteToken(token) {
      const { data } = await axiosInstance.post('/messages/group-invite/join', { token });
      return data.data;
    },
  },
  e2ee: {
    async registerDevice(payload) {
      const { data } = await axiosInstance.post('/e2ee/devices/register', payload || {}, {
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data;
    },
    async getMyDevices() {
      const { data } = await axiosInstance.get('/e2ee/devices/my', { timeout: E2EE_REQUEST_TIMEOUT_MS });
      return data.data ?? [];
    },
    async getUserPublicDevices(userId) {
      const { data } = await axiosInstance.get(`/e2ee/devices/public/${userId}`, {
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data ?? [];
    },
    async uploadPrekeys(deviceId, prekeys = []) {
      const { data } = await axiosInstance.post(
        '/e2ee/prekeys/upload',
        { deviceId, prekeys },
        { timeout: E2EE_REQUEST_TIMEOUT_MS }
      );
      return data.data;
    },
    async getPrekeyHealth(deviceId) {
      const { data } = await axiosInstance.get('/e2ee/prekeys/health', {
        params: { deviceId },
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data?.data ?? data;
    },
    async rotateSignedPrekey(payload) {
      const { data } = await axiosInstance.post('/e2ee/devices/rotate-signed-prekey', payload || {}, {
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data;
    },
    async getBundle(userId) {
      const { data } = await axiosInstance.get(`/e2ee/bundle/${userId}`, {
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data;
    },
    async consumePrekey(prekeyRowId) {
      const { data } = await axiosInstance.post(
        '/e2ee/prekeys/consume',
        { prekeyRowId },
        { timeout: E2EE_REQUEST_TIMEOUT_MS }
      );
      return data.data;
    },
    async storeEnvelope(payload) {
      const { data } = await axiosInstance.post('/e2ee/messages/envelope', payload || {}, {
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data;
    },
    async syncEnvelopes({ deviceId, since = null, limit = 100, conversationId = null, groupId = null }) {
      const params = { deviceId, limit };
      if (since) params.since = since;
      if (conversationId) params.conversationId = conversationId;
      if (groupId) params.groupId = groupId;
      const { data } = await axiosInstance.get('/e2ee/messages/sync', {
        params,
        timeout: E2EE_REQUEST_TIMEOUT_MS,
      });
      return data.data;
    },
  },
  translate: {
    /** Traduction de texte (auth). Cible fr ou en (bm → fr côté serveur). */
    async text(text, options = {}) {
      const { data } = await axiosInstance.post('/translate', {
        text,
        target: options.target || 'fr',
        source: options.source || 'auto',
      });
      const payload = data?.data ?? data;
      return {
        translatedText: payload?.translatedText ?? '',
        target: payload?.target,
        detectedSource: payload?.detectedSource,
      };
    },
  },
  leaderboard: {
    async get(params = {}) {
      const { data } = await axiosInstance.get('/leaderboard', { params });
      return data.data ?? data;
    },
  },
  gamification: {
    async getMe() {
      const { data } = await axiosInstance.get('/gamification/me');
      return data.data;
    },
    async getDailyMissions() {
      const { data } = await axiosInstance.get('/gamification/daily-missions');
      return data.data ?? [];
    },
    async awardPoints(payload) {
      const { data } = await axiosInstance.post('/gamification/award', payload);
      return data.data;
    },
    async awardBadge(payload) {
      const { data } = await axiosInstance.post('/gamification/badge', payload);
      return data.data;
    },
  },
  viewHistory: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/view-history', { params });
      return data.data ?? [];
    },
    async record(videoId, watchTimeSeconds = 0, watchPercent = null) {
      const { data } = await axiosInstance.post('/view-history', {
        video_id: videoId,
        watch_time_seconds: watchTimeSeconds,
        ...(watchPercent != null && { watch_percent: watchPercent }),
      });
      return data.data;
    },
  },
  analytics: {
    async getVideoAnalytics(videoId, startDate, endDate) {
      const params = {};
      if (startDate) params.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
      if (endDate) params.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
      const { data } = await axiosInstance.get(`/analytics/video/${videoId}`, { params });
      return data.data ?? [];
    },
    async getCreatorAnalytics(creatorId, startDate, endDate) {
      const params = {};
      if (startDate) params.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
      if (endDate) params.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
      const { data } = await axiosInstance.get(`/analytics/creator/${creatorId}`, { params });
      return data.data;
    },
    async recordVideo(payload) {
      const { data } = await axiosInstance.post('/analytics/video/record', payload);
      return data.data;
    },
  },
  moderation: {
    async report(contentType, contentId, reason, description, severity) {
      const { data } = await axiosInstance.post('/moderation/report', {
        contentType,
        contentId,
        reason,
        description: description || '',
        severity: severity ?? (['harassment', 'hate_speech', 'explicit_content'].includes(reason) ? 'high' : 'medium'),
      });
      return data.data;
    },
  },
  live: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/live', { params });
      return data.data;
    },
    async getDiscovery(params = {}) {
      const { data } = await axiosInstance.get('/live/discovery', { params });
      return data.data;
    },
    async getRecommendations(params = {}) {
      const { data } = await axiosInstance.get('/live/recommendations', { params });
      return data.data;
    },
    async getCategories() {
      const { data } = await axiosInstance.get('/live/categories');
      return data.data;
    },
    async getGifts(category) {
      const { data } = await axiosInstance.get('/live/gifts', { params: category ? { category } : {} });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/live/${id}`);
      return data.data;
    },
    async getWallet() {
      const { data } = await axiosInstance.get('/live/wallet');
      return data.data;
    },
    async rechargeWallet(payload) {
      const { data } = await axiosInstance.post('/live/wallet/recharge', payload);
      return data.data;
    },
    async confirmWalletRecharge(transactionId) {
      const { data } = await axiosInstance.get('/live/wallet/recharge/confirm', { params: { transactionId } });
      return data.data;
    },
    async getCreatorLevel(userId) {
      const { data } = await axiosInstance.get(`/live/creator-level/${userId}`);
      return data.data;
    },
    async start(liveData) {
      const { data } = await axiosInstance.post('/live/start', {
        title: liveData.title,
        description: liveData.description,
        category: liveData.category,
        streamUrl: liveData.stream_url || liveData.streamUrl || '',
        thumbnail_url: liveData.thumbnail_url,
        stream_key: liveData.stream_key,
        rtmp_url: liveData.rtmp_url,
        playback_url: liveData.playback_url,
        region: liveData.region,
        // Live: langue forcée à 'fr' (CDC adapté Afriwonder)
        language: 'fr',
        status: liveData.status,
        scheduled_at: liveData.scheduled_at,
      });
      return data.data;
    },
    async startScheduled(id) {
      const { data } = await axiosInstance.post(`/live/${id}/start-scheduled`);
      return data.data;
    },
    async getAgoraStatus() {
      const { data } = await axiosInstance.get('/live/agora-status');
      return data.data;
    },
    async getStreamToken(id, role = 'audience') {
      const { data } = await axiosInstance.get(`/live/${id}/token`, { params: { role } });
      return data.data;
    },
    async joinViewer(id, sessionId, options = {}) {
      const { data } = await axiosInstance.post(`/live/${id}/join`, { sessionId, country: options.country });
      return data.data;
    },
    async leaveViewer(id, sessionId) {
      await axiosInstance.post(`/live/${id}/leave`, { sessionId });
    },
    async heartbeat(id, sessionId) {
      await axiosInstance.post(`/live/${id}/heartbeat`, { sessionId });
    },
    async end(id, options = {}) {
      const { data } = await axiosInstance.post(`/live/${id}/end`, options);
      return data.data;
    },
    async sendChatMessage(id, message) {
      const { data } = await axiosInstance.post(`/live/${id}/chat`, { message });
      return data.data;
    },
    async sendTip(id, payload) {
      const { data } = await axiosInstance.post(`/live/${id}/tip`, payload);
      return data.data;
    },
    async sendGift(id, giftData) {
      const { data } = await axiosInstance.post(`/live/${id}/gift`, giftData);
      return data.data;
    },
    async like(id) {
      const { data } = await axiosInstance.post(`/live/${id}/like`);
      return data.data;
    },
    async reaction(id, type = 'like') {
      const { data } = await axiosInstance.post(`/live/${id}/reaction`, { type });
      return data.data;
    },
    async getChapters(id) {
      const { data } = await axiosInstance.get(`/live/${id}/chapters`);
      return data.data;
    },
    async addChapter(id, payload) {
      const { data } = await axiosInstance.post(`/live/${id}/chapters`, payload);
      return data.data;
    },
    async exportCreatorAnalytics(format = 'csv') {
      const res = await axiosInstance.get('/live/creator/export', { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' });
      return res.data;
    },
    async subscribeToCreator(creatorId, amount = 500) {
      const { data } = await axiosInstance.post(`/live/creator/${creatorId}/subscribe`, { amount });
      return data.data;
    },
    async unsubscribeFromCreator(creatorId) {
      await axiosInstance.delete(`/live/creator/${creatorId}/subscribe`);
    },
    async getTopDonors(id, limit = 10) {
      const { data } = await axiosInstance.get(`/live/${id}/top-donors`, { params: { limit } });
      return data.data;
    },
    async createPoll(id, pollData) {
      const { data } = await axiosInstance.post(`/live/${id}/polls`, pollData);
      return data.data;
    },
    async votePoll(id, pollId, optionIndex) {
      const { data } = await axiosInstance.post(`/live/${id}/polls/${pollId}/vote`, { optionIndex });
      return data.data;
    },
    async getPolls(id) {
      const { data } = await axiosInstance.get(`/live/${id}/polls`);
      return data.data;
    },
    async getMyPollVote(id, pollId) {
      const { data } = await axiosInstance.get(`/live/${id}/polls/${pollId}/my-vote`);
      return data.data;
    },
    async endPoll(id, pollId) {
      const { data } = await axiosInstance.post(`/live/${id}/polls/${pollId}/end`);
      return data.data;
    },
    async inviteCoHost(id, userId) {
      const { data } = await axiosInstance.post(`/live/${id}/cohost/invite`, { userId });
      return data.data;
    },
    async acceptCoHostInvite(id) {
      const { data } = await axiosInstance.post(`/live/${id}/cohost/accept`);
      return data.data;
    },
    async removeCoHost(id, userId) {
      const { data } = await axiosInstance.post(`/live/${id}/cohost/remove`, { userId });
      return data.data;
    },
    async getAnalytics(id) {
      const { data } = await axiosInstance.get(`/live/${id}/analytics`);
      return data.data;
    },
    async report(id, reason, description) {
      const { data } = await axiosInstance.post('/moderation/report', {
        contentType: 'live',
        contentId: id,
        reason,
        description,
        severity: ['harassment', 'hate_speech', 'explicit_content'].includes(reason) ? 'high' : 'medium',
      });
      return data.data;
    },
    async getModeration(id) {
      const { data } = await axiosInstance.get(`/live/${id}/moderation`);
      return data.data;
    },
    async updateModeration(id, settings) {
      const { data } = await axiosInstance.patch(`/live/${id}/moderation`, settings);
      return data.data;
    },
    async addModerator(id, userId) {
      const { data } = await axiosInstance.post(`/live/${id}/moderators`, { userId });
      return data.data;
    },
    async removeModerator(id, userId) {
      await axiosInstance.delete(`/live/${id}/moderators/${userId}`);
    },
    async ban(id, payload) {
      const { data } = await axiosInstance.post(`/live/${id}/ban`, payload);
      return data.data;
    },
    async deleteChatMessage(id, messageId) {
      await axiosInstance.delete(`/live/${id}/chat/${messageId}`);
    },
    async updateChatMessage(id, messageId, updates) {
      const { data } = await axiosInstance.patch(`/live/${id}/chat/${messageId}`, updates);
      return data.data;
    },
    async pinChatMessage(id, messageId, pin = true) {
      const { data } = await axiosInstance.patch(`/live/${id}/chat/${messageId}/pin`, { pin });
      return data.data;
    },
    async deleteReplay(id) {
      const { data } = await axiosInstance.delete(`/live/${id}/replay`);
      return data.data;
    },
    async updateReplayUrl(id, replayUrl) {
      const { data } = await axiosInstance.patch(`/live/${id}/replay`, { replay_url: replayUrl });
      return data.data;
    },
    async updateViewers(id, count) {
      const { data } = await axiosInstance.put(`/live/${id}/viewers`, { count });
      return data.data;
    },
    async cleanupViewers(id) {
      const { data } = await axiosInstance.post(`/live/${id}/cleanup-viewers`);
      return data.data;
    },
  },
  news: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/news', { params });
      return data.data;
    },
    async getByIdOrSlug(idOrSlug) {
      const { data } = await axiosInstance.get(`/news/${encodeURIComponent(idOrSlug)}`);
      return data.data;
    },
    async getBreaking() {
      const { data } = await axiosInstance.get('/news/breaking');
      return data.data;
    },
    async getTrending(limit = 10) {
      const { data } = await axiosInstance.get('/news/trending', { params: { limit } });
      return data.data;
    },
    async getFeed(page = 1, limit = 20) {
      const { data } = await axiosInstance.get('/news/feed', { params: { page, limit } });
      return data.data;
    },
    async getComments(articleId, page = 1, limit = 30) {
      const { data } = await axiosInstance.get(`/news/${articleId}/comments`, { params: { page, limit } });
      return data.data;
    },
    async toggleLike(articleId) {
      const { data } = await axiosInstance.post(`/news/${articleId}/like`);
      return data.data;
    },
    async share(articleId) {
      const { data } = await axiosInstance.post(`/news/${articleId}/share`);
      return data.data;
    },
    async addComment(articleId, content, parentId) {
      const { data } = await axiosInstance.post(`/news/${articleId}/comments`, { content, parentId });
      return data.data;
    },
    async deleteComment(commentId) {
      await axiosInstance.delete(`/news/comments/${commentId}`);
    },
    async reportComment(commentId) {
      await axiosInstance.post(`/news/comments/${commentId}/report`);
    },
    async getPreferences() {
      const { data } = await axiosInstance.get('/news/preferences/me');
      return data.data;
    },
    async savePreferences(prefs) {
      const { data } = await axiosInstance.put('/news/preferences', prefs);
      return data.data;
    },
    async hasPremiumAccess() {
      const { data } = await axiosInstance.get('/news/premium-access');
      return data.data?.hasAccess ?? false;
    },
    async getVerifiedSources() {
      const { data } = await axiosInstance.get('/news/verified-sources');
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/news', payload);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await axiosInstance.patch(`/news/${id}`, payload);
      return data.data;
    },
    async setStatus(id, status) {
      const { data } = await axiosInstance.post(`/news/${id}/status`, { status });
      return data.data;
    },
    async getAdminArticles(page = 1, limit = 20) {
      const { data } = await axiosInstance.get('/news/admin/articles', { params: { page, limit } });
      return data.data;
    },
    async getArticleAnalytics(articleId) {
      const { data } = await axiosInstance.get(`/news/${articleId}/analytics`);
      return data.data;
    },
  },
  // Placeholder for entities not yet implemented
  entities: {
    LiveStream: {
      filter: async () => [],
      list: async () => [],
      async create(data) {
        // Utiliser la nouvelle API live
        const { data: result } = await axiosInstance.post('/live/start', {
          title: data.title,
          description: data.description,
          category: data.category,
          streamUrl: data.stream_url || 'live',
        });
        return result.data;
      },
      async update(id, updateData) {
        // Si on met à jour le statut à 'ended', utiliser l'endpoint end
        if (updateData.status === 'ended') {
          const { data } = await axiosInstance.post(`/live/${id}/end`);
          return data.data;
        }
        // Pour d'autres mises à jour, on pourrait avoir besoin d'un endpoint PUT
        // Pour l'instant, retourner les données mises à jour
        return { id, ...updateData };
      },
      delete: async () => {},
    },
    LiveChat: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
      update: async () => {},
    },
    LiveGift: {
      create: async (data) => ({ id: 'temp', ...data }),
    },
    LiveStreamBan: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Course: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Community: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    CommunityMember: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Enrollment: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
      update: async () => {},
    },
    Certificate: {
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Event: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Campaign: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Petition: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Job: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Service: {
      async filter(params = {}) {
        try {
          const { data } = await axiosInstance.get('/services', { params });
          return data.data?.services || data.data || [];
        } catch {
          return [];
        }
      },
      async list(params = {}) {
        return this.filter(params);
      },
      async create(serviceData) {
        try {
          const { data } = await axiosInstance.post('/services', serviceData);
          return data.data;
        } catch (error) {
          console.error('Error creating service:', error);
          throw error;
        }
      },
      async getById(id) {
        try {
          const { data } = await axiosInstance.get(`/services/${id}`);
          return data.data;
        } catch (error) {
          console.error('Error getting service:', error);
          throw error;
        }
      },
    },
    Loan: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Article: {
      filter: async () => [],
      list: async () => [],
    },
    Badge: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    UserBadge: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    UserPoints: {
      filter: async () => [],
      update: async () => {},
    },
    Challenge: {
      filter: async () => [],
      list: async () => [],
    },
    Story: {
      filter: async () => [],
      list: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Message: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Dispute: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Report: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Review: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Payout: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
    },
    Address: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
      update: async () => {},
      delete: async () => {},
    },
    Cart: {
      filter: async () => ({ items: [], subtotal: 0 }),
      update: async (id, data) => data,
      create: async (data) => ({ id: 'temp', ...data }),
    },
    PlatformSettings: {
      list: async () => [{ commission_rate: 10 }],
    },
    ViewHistory: {
      filter: async () => [],
      create: async () => {},
    },
    Follow: {
      filter: async () => [],
      create: async (data) => ({ id: 'temp', ...data }),
      delete: async () => {},
    },
    Like: {
      async filter(params = {}, sort = '', limit = 0) {
        try {
          // Si on filtre par user_id, utiliser l'endpoint users pour récupérer les vidéos likées
          if (params.user_id) {
            try {
              const { data } = await axiosInstance.get(`/users/${params.user_id}/liked-videos`, {
                params: { limit: limit !== undefined ? limit : 0, page: params.page || 1 }
              });
              
              // Si l'endpoint retourne des vidéos, les convertir en format Like
              if (data.data && Array.isArray(data.data.videos)) {
                return data.data.videos.map(video => ({
                  id: `like-${params.user_id}-${video.id}`,
                  user_id: params.user_id,
                  video_id: video.id,
                  created_at: video.created_at || new Date().toISOString()
                }));
              }
              
              return data.data?.videos || [];
            } catch (error) {
              console.error('Error fetching liked videos:', error);
              return [];
            }
          }
          
          // Pour d'autres filtres, retourner un tableau vide pour l'instant
          return [];
        } catch (error) {
          console.error('Error filtering likes:', error);
          return [];
        }
      },
      async create(data) {
        try {
          // Créer un like via l'endpoint de like de vidéo
          if (data.video_id) {
            const { data: result } = await axiosInstance.post(`/videos/${data.video_id}/like`);
            return {
              id: `like-${data.user_id}-${data.video_id}`,
              user_id: data.user_id,
              video_id: data.video_id,
              created_at: new Date().toISOString()
            };
          }
          return { id: `temp-${Date.now()}`, ...data };
        } catch (error) {
          console.error('Error creating like:', error);
          throw error;
        }
      },
      async delete(id) {
        try {
          // Extraire video_id de l'ID du like (format: like-user_id-video_id)
          const parts = id.split('-');
          if (parts.length >= 3 && parts[0] === 'like') {
            const videoId = parts.slice(2).join('-');
            await axiosInstance.post(`/videos/${videoId}/like`); // Toggle pour supprimer
          }
        } catch (error) {
          console.error('Error deleting like:', error);
          throw error;
        }
      },
    },
    Save: {
      filter: async () => [],
      create: async () => {},
      delete: async () => {},
    },
    Comment: {
      filter: async () => [],
      create: async () => {},
      async update(id, commentData) {
        try {
          // Try to use a direct endpoint if it exists
          const { data } = await axiosInstance.put(`/comments/${id}`, commentData);
          return data.data;
        } catch (error) {
          // If endpoint doesn't exist, return the updated data as placeholder
          console.warn('Comment update endpoint not available, using placeholder');
          return { id, ...commentData };
        }
      },
      async delete(id) {
        try {
          // Try to use a direct endpoint if it exists
          await axiosInstance.delete(`/comments/${id}`);
        } catch (error) {
          // If endpoint doesn't exist, just resolve
          console.warn('Comment delete endpoint not available, using placeholder');
        }
      },
    },
    /** Liste créateurs / utilisateurs (GET /users — optionalAuth, pour Discover public) */
    User: {
      async list(_sort = '', limit = 20) {
        try {
          const params = { page: 1, limit: Math.min(Math.max(1, limit || 20), 50) };
          const { data } = await axiosInstance.get('/users', { params });
          const result = data.data;
          return Array.isArray(result) ? result : (result?.users || []);
        } catch (error) {
          console.warn('entities.User.list', error);
          return [];
        }
      },
    },
    Video: {
      async filter(params = {}, sort = '', limit = 0) {
        try {
          // Convertir les paramètres vers le format API Express
          /** @type {Record<string, unknown>} */
          const apiParams = { ...params };
          
          // Gérer le tri (ex. '-created_date' -> { sort: 'created_date', order: 'desc' })
          if (sort) {
            if (sort.startsWith('-')) {
              apiParams.sort = sort.substring(1);
              apiParams.order = 'desc';
            } else {
              apiParams.sort = sort;
              apiParams.order = 'asc';
            }
          }
          
          // Gérer la limite (0 = pas de limite)
          apiParams.limit = limit !== undefined ? limit : 0;
          
          // Gérer la pagination si nécessaire
          if (!apiParams.page) {
            apiParams.page = 1;
          }
          
          // Mapper creator_id vers userId si présent (l'API Express accepte les deux)
          if (params.creator_id && !params.userId) {
            apiParams.userId = params.creator_id;
            // Garder aussi creator_id au cas où l'API le supporte
          }
          
          // Mapper id vers l'ID spécifique si présent
          if (params.id) {
            const { data } = await axiosInstance.get(`/videos/${params.id}`);
            return data.data ? [data.data] : [];
          }
          
          const { data } = await axiosInstance.get('/videos', { params: apiParams });
          
          // Gérer différents formats de réponse
          if (Array.isArray(data.data)) {
            return data.data;
          } else if (data.data && Array.isArray(data.data.videos)) {
            return data.data.videos;
          } else if (data.videos && Array.isArray(data.videos)) {
            return data.videos;
          }
          
          return [];
        } catch (error) {
          console.error('Error filtering videos:', error);
          return [];
        }
      },
      async list(sort = '', limit = 20) {
        try {
          const params = { page: 1 };
          
          // Gérer le tri
          if (sort) {
            if (sort.startsWith('-')) {
              params.sort = sort.substring(1);
              params.order = 'desc';
            } else {
              params.sort = sort;
              params.order = 'asc';
            }
          }
          
          // Gérer la limite
          if (limit) {
            params.limit = limit;
          }
          
          const { data } = await axiosInstance.get('/videos', { params });
          
          // Gérer différents formats de réponse
          if (Array.isArray(data.data)) {
            return data.data;
          } else if (data.data && Array.isArray(data.data.videos)) {
            return data.data.videos;
          } else if (data.videos && Array.isArray(data.videos)) {
            return data.videos;
          }
          
          return [];
        } catch (error) {
          console.error('Error listing videos:', error);
          return [];
        }
      },
      async create(videoData) {
        try {
          // Valider les champs requis selon le schéma backend
          // ⚠️ creator_id est ajouté automatiquement par le backend depuis req.user
          if (!videoData.title || !videoData.video_url) {
            throw new Error('Les champs title et video_url sont requis');
          }
          
          // Rejeter les URLs de domaines externes non autorisés
          if (videoData.video_url.includes('base44') || videoData.video_url.includes('base44.com')) {
            throw new Error('URLs non autorisées. Utilisez uniquement les URLs de votre CDN (R2/Cloudflare).');
          }
          
          // Préparer les données selon le schéma Prisma (seulement les champs acceptés)
          // Le backend ignore les champs non reconnus, mais on envoie seulement ce qui est nécessaire
          const payload = {
            title: videoData.title,
            description: videoData.description || '',
            video_url: videoData.video_url,
            thumbnail_url: videoData.thumbnail_url || videoData.video_url,
            category: videoData.category || 'divertissement',
            visibility: videoData.visibility || 'public',
          };
          if (Array.isArray(videoData.hashtags) && videoData.hashtags.length > 0) payload.hashtags = videoData.hashtags;
          if (videoData.music_title != null && String(videoData.music_title).trim()) payload.music_title = videoData.music_title;

          const { data } = await axiosInstance.post('/videos', payload);
          return data.data;
        } catch (error) {
          console.error('Error creating video:', error);
          throw error;
        }
      },
      async update(id, videoData) {
        try {
          const { data } = await axiosInstance.put(`/videos/${id}`, videoData);
          return data.data;
        } catch (error) {
          console.error('Error updating video:', error);
          throw error;
        }
      },
      async delete(id) {
        try {
          await axiosInstance.delete(`/videos/${id}`);
        } catch (error) {
          console.error('Error deleting video:', error);
          throw error;
        }
      },
      async getById(id) {
        try {
          const { data } = await axiosInstance.get(`/videos/${id}`);
          return data.data;
        } catch (error) {
          console.error('Error getting video by id:', error);
          throw error;
        }
      },
    },
    Music: {
      async filter(params = {}, sort = '', limit = 20) {
        try {
          // Pour l'instant, utiliser un endpoint placeholder ou retourner un tableau vide
          // TODO: Implémenter l'endpoint /api/music dans le backend
          const { data } = await axiosInstance.get('/music', { 
            params: { ...params, sort, limit } 
          }).catch(() => ({ data: { data: [] } }));
          return data.data || [];
        } catch {
          return [];
        }
      },
      async create(musicData) {
        try {
          const { data } = await axiosInstance.post('/music', musicData);
          return data.data;
        } catch (error) {
          // Fallback: retourner les données avec un ID temporaire
          return { id: `temp-${Date.now()}`, ...musicData };
        }
      },
      async list(params = {}) {
        return this.filter(params);
      },
    },
  },
  marketplaceSubscription: {
    async getPlans() {
      const { data } = await axiosInstance.get('/marketplace-subscription/plans');
      return data.data;
    },
    async getMe() {
      const { data } = await axiosInstance.get('/marketplace-subscription/me');
      return data.data;
    },
    async subscribe(planType, options = {}) {
      const { payment_method = 'orange_money', orange_money_phone } = options;
      const payload = { plan_type: planType };
      if (planType !== 'free') {
        payload.payment_method = payment_method;
        payload.orange_money_phone = orange_money_phone;
      }
      const { data } = await axiosInstance.post('/marketplace-subscription/subscribe', payload);
      return data.data;
    },
    async adminList(params = {}) {
      const { data } = await axiosInstance.get('/marketplace-subscription/admin/subscriptions', { params });
      return data.data;
    },
    async adminUpdateStatus(id, status) {
      const { data } = await axiosInstance.patch(`/marketplace-subscription/admin/subscriptions/${id}/status`, { status });
      return data.data;
    },
  },
  // Services Locaux - Module complet
  services: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/services', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/services/${id}`);
      return data.data;
    },
    async create(serviceData) {
      const { data } = await axiosInstance.post('/services', serviceData);
      return data.data;
    },
    async contact(id) {
      const { data } = await axiosInstance.post(`/services/${id}/contact`);
      return data.data;
    },
    async getPending(params = {}) {
      const { data } = await axiosInstance.get('/services/admin/pending', { params });
      return data.data;
    },
    async approve(id) {
      const { data } = await axiosInstance.post(`/services/${id}/approve`);
      return data.data;
    },
    async reject(id) {
      const { data } = await axiosInstance.post(`/services/${id}/reject`);
      return data.data;
    },
    async update(id, serviceData) {
      const { data } = await axiosInstance.put(`/services/${id}`, serviceData);
      return data.data;
    },
    async delete(id) {
      const { data } = await axiosInstance.delete(`/services/${id}`);
      return data.data;
    },
  },
  providers: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/providers', { params });
      return data.data;
    },
    async getPending() {
      const { data } = await axiosInstance.get('/providers/admin/pending');
      return data.data ?? [];
    },
    async approve(id) {
      const { data } = await axiosInstance.post(`/providers/${id}/verify`);
      return data.data;
    },
    async reject(id, reason) {
      const { data } = await axiosInstance.post(`/providers/${id}/reject`, { reason });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/providers/${id}`);
      return data.data;
    },
    async getByUserId(userId) {
      try {
        const { data } = await axiosInstance.get('/providers', {
          params: { user_id: userId },
        });
        if (data.data && !data.data.providers) {
          return data.data;
        }
        return data.data?.providers?.find(p => p.user_id === userId) || null;
      } catch {
        return null;
      }
    },
    async create(providerData) {
      const { data } = await axiosInstance.post('/providers', providerData);
      return data.data;
    },
    async update(id, providerData) {
      const { data } = await axiosInstance.put(`/providers/${id}`, providerData);
      return data.data;
    },
    async getServices(providerId, params = {}) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/services`, { params });
      return data.data;
    },
    async getAvailability(providerId, params = {}) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/availability`, { params });
      return data.data;
    },
    async setAvailability(providerId, availabilities) {
      const { data } = await axiosInstance.put(`/providers/${providerId}/availability`, { availabilities });
      return data.data;
    },
    async getAvailableSlots(providerId, params = {}) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/available-slots`, { params });
      return data.data;
    },
    async getPayouts(providerId, params = {}) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/payouts`, { params });
      return data.data;
    },
    async getAvailablePayout(providerId) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/payouts/available`);
      return data.data;
    },
    async requestPayout(providerId, bookingIds) {
      const { data } = await axiosInstance.post(`/providers/${providerId}/payouts/request`, { booking_ids: bookingIds });
      return data.data;
    },
  },
  bookings: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/bookings', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/bookings/${id}`);
      return data.data;
    },
    async create(bookingData) {
      const { data } = await axiosInstance.post('/bookings', bookingData);
      return data.data;
    },
    async confirm(id) {
      const { data } = await axiosInstance.put(`/bookings/${id}/confirm`);
      return data.data;
    },
    async updateStatus(id, status, reason) {
      const { data } = await axiosInstance.put(`/bookings/${id}/status`, { status, reason });
      return data.data;
    },
    async cancel(id, reason) {
      const { data } = await axiosInstance.post(`/bookings/${id}/cancel`, { reason });
      return data.data;
    },
    async complete(id) {
      const { data } = await axiosInstance.post(`/bookings/${id}/complete`);
      return data.data;
    },
    async confirmPayment(id, transactionId) {
      const { data } = await axiosInstance.post(`/bookings/${id}/confirm-payment`, { transaction_id: transactionId });
      return data.data;
    },
  },
  serviceReviews: {
    async create(reviewData) {
      const { data } = await axiosInstance.post('/service-reviews', reviewData);
      return data.data;
    },
    async getServiceReviews(serviceId, params = {}) {
      const { data } = await axiosInstance.get(`/services/${serviceId}/reviews`, { params });
      return data.data;
    },
    async getProviderReviews(providerId, params = {}) {
      const { data } = await axiosInstance.get(`/providers/${providerId}/reviews`, { params });
      return data.data;
    },
    async report(id, reason) {
      const { data } = await axiosInstance.post(`/service-reviews/${id}/report`, { reason });
      return data.data;
    },
  },
  serviceDisputes: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/service-disputes', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/service-disputes/${id}`);
      return data.data;
    },
    async create(disputeData) {
      const { data } = await axiosInstance.post('/service-disputes', disputeData);
      return data.data;
    },
    async update(id, disputeData) {
      const { data } = await axiosInstance.put(`/service-disputes/${id}`, disputeData);
      return data.data;
    },
    async resolve(id, resolutionData) {
      const { data } = await axiosInstance.put(`/service-disputes/${id}/resolve`, resolutionData);
      return data.data;
    },
  },
  servicePayouts: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/service-payouts', { params });
      return data.data;
    },
    async process(id) {
      const { data } = await axiosInstance.post(`/service-payouts/${id}/process`);
      return data.data;
    },
    async complete(id) {
      const { data } = await axiosInstance.post(`/service-payouts/${id}/complete`);
      return data.data;
    },
  },
  courses: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/courses', { params });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/courses/${id}`);
      return data.data;
    },
    async getMyEnrollment(courseId) {
      const { data } = await axiosInstance.get(`/courses/${courseId}/enrollment`);
      return data.data;
    },
    getEnrollment(courseId) {
      return this.getMyEnrollment(courseId);
    },
    async getRecommendations(limit = 10) {
      const { data } = await axiosInstance.get('/courses/recommendations', { params: { limit } });
      return data.data;
    },
    async getWishlist(page = 1, limit = 20) {
      const { data } = await axiosInstance.get('/courses/wishlist', { params: { page, limit } });
      return data.data;
    },
    async addWishlist(courseId) {
      await axiosInstance.post(`/courses/${courseId}/wishlist`);
    },
    async removeWishlist(courseId) {
      await axiosInstance.delete(`/courses/${courseId}/wishlist`);
    },
    async getReviews(courseId, page = 1, limit = 20) {
      const { data } = await axiosInstance.get(`/courses/${courseId}/reviews`, { params: { page, limit } });
      return data.data;
    },
    async addReview(courseId, rating, comment) {
      const { data } = await axiosInstance.post(`/courses/${courseId}/reviews`, { rating, comment });
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/courses', payload);
      return data.data;
    },
    async enroll(courseId, body = {}) {
      const { data } = await axiosInstance.post(`/courses/${courseId}/enroll`, body);
      return data.data;
    },
    async updateProgress(enrollmentId, progress) {
      const { data } = await axiosInstance.put(`/courses/enrollments/${enrollmentId}/progress`, { progress });
      return data.data;
    },
    async completeLesson(enrollmentId, lessonId) {
      const { data } = await axiosInstance.post(`/courses/enrollments/${enrollmentId}/lessons/${lessonId}/complete`);
      return data.data;
    },
    async getInstructorDashboard() {
      const { data } = await axiosInstance.get('/courses/instructor/dashboard');
      return data.data;
    },
    providers: {
      async getMe() {
        const { data } = await axiosInstance.get('/courses/provider/me');
        return data.data;
      },
      async register(payload) {
        const { data } = await axiosInstance.post('/courses/provider/register', payload);
        return data.data;
      },
      async getPending() {
        const { data } = await axiosInstance.get('/courses/provider/admin/pending');
        return data.data;
      },
      async approve(id) {
        const { data } = await axiosInstance.post(`/courses/provider/admin/${id}/approve`);
        return data.data;
      },
      async reject(id, reason) {
        const { data } = await axiosInstance.post(`/courses/provider/admin/${id}/reject`, { reason });
        return data.data;
      },
    },
    async getLessonStream(enrollmentId, lessonId, quality) {
      const params = quality ? { quality } : {};
      const { data } = await axiosInstance.get(`/courses/enrollments/${enrollmentId}/lessons/${lessonId}/stream`, { params });
      return data.data;
    },
  },
  certificates: {
    async list() {
      const { data } = await axiosInstance.get('/certificates');
      return data.data;
    },
    async verify(token) {
      const { data } = await axiosInstance.get(`/certificates/verify/${token}`);
      return data.data;
    },
    getPdfUrl(certificateId) {
      const token = getItem('access_token');
      const base = axiosInstance.defaults.baseURL || '';
      return `${base}/certificates/${certificateId}/pdf${token ? `?Authorization=Bearer%20${encodeURIComponent(token)}` : ''}`;
    },
    async getPdfBlob(certificateId) {
      const { data } = await axiosInstance.get(`/certificates/${certificateId}/pdf`, { responseType: 'blob' });
      return data;
    },
  },
  // Civic (pétitions) - API REST backend
  civic: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/civic', { params });
      const raw = data.data;
      if (!raw) return { petitions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return { petitions: raw.petitions ?? [], pagination: raw.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
    },
    async getRecommended(limit = 10) {
      const { data } = await axiosInstance.get('/civic/recommended', { params: { limit } });
      return data.data ?? [];
    },
    async getCreatorDashboard(petitionId) {
      const { data } = await axiosInstance.get('/civic/creator/dashboard', { params: petitionId ? { petitionId } : {} });
      return data.data;
    },
    async getSavedList(params = {}) {
      const { data } = await axiosInstance.get('/civic/saved/list', { params });
      return data.data ?? { petitions: [], pagination: {} };
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/civic/${id}`);
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/civic', {
        title: payload.title,
        description: payload.description,
        goalSignatures: payload.goalSignatures ?? payload.goal_signatures,
        endDate: payload.endDate ?? payload.end_date,
        category: payload.category,
        country: payload.country,
        region: payload.region,
        city: payload.city,
        isNational: payload.isNational ?? payload.is_national ?? true,
        targetAuthorityEmail: payload.targetAuthorityEmail ?? payload.target_authority_email,
      });
      return data.data;
    },
    async sign(id, options = {}) {
      const { data } = await axiosInstance.post(`/civic/${id}/sign`, {
        comment: options.comment,
        recaptchaToken: options.recaptchaToken,
        ipAddress: options.ipAddress,
        signerCity: options.signerCity,
        signerCountry: options.signerCountry,
      });
      return data.data;
    },
    async listComments(id, page = 1, limit = 20) {
      const { data } = await axiosInstance.get(`/civic/${id}/comments`, { params: { page, limit } });
      return data.data ?? { comments: [], pagination: {} };
    },
    async addComment(id, content, parentId) {
      const { data } = await axiosInstance.post(`/civic/${id}/comments`, { content, parentId });
      return data.data;
    },
    async likeComment(commentId) {
      const { data } = await axiosInstance.post(`/civic/comments/${commentId}/like`);
      return data.data;
    },
    async recordShare(id) {
      await axiosInstance.post(`/civic/${id}/share`);
    },
    async save(id) {
      await axiosInstance.post(`/civic/${id}/save`);
    },
    async unsave(id) {
      await axiosInstance.delete(`/civic/${id}/save`);
    },
    async report(id, reason, description) {
      const { data } = await axiosInstance.post(`/civic/${id}/report`, { reason, description });
      return data.data;
    },
    async donate(petitionId, payload) {
      const { data } = await axiosInstance.post(`/civic/${petitionId}/donate`, payload);
      return data.data;
    },
  },
  // Jobs - API REST backend
  jobs: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/jobs', { params });
      const raw = data.data;
      if (!raw) return { jobs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return { jobs: raw.jobs ?? [], pagination: raw.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
    },
    async getRecommended(limit = 10) {
      const { data } = await axiosInstance.get('/jobs/recommended', { params: { limit } });
      return data.data ?? [];
    },
    async getEmployerDashboard() {
      const { data } = await axiosInstance.get('/jobs/dashboard/employer');
      return data.data;
    },
    async getCandidateProfile() {
      const { data } = await axiosInstance.get('/jobs/profile/candidate');
      return data.data ?? null;
    },
    async upsertCandidateProfile(payload) {
      const { data } = await axiosInstance.put('/jobs/profile/candidate', {
        cvUrl: payload.cvUrl ?? payload.cv_url,
        portfolioUrl: payload.portfolioUrl ?? payload.portfolio_url,
        skills: payload.skills,
        experience: payload.experience,
        education: payload.education,
        availability: payload.availability,
        phone: payload.phone,
      });
      return data.data;
    },
    async getCompanyProfile() {
      const { data } = await axiosInstance.get('/jobs/profile/company');
      return data.data ?? null;
    },
    async upsertCompanyProfile(payload) {
      const { data } = await axiosInstance.put('/jobs/profile/company', {
        companyName: payload.companyName ?? payload.company_name,
        description: payload.description,
        logoUrl: payload.logoUrl ?? payload.logo_url,
        documentsLegal: payload.documentsLegal ?? payload.documents_legal,
      });
      return data.data;
    },
    async getSavedList(params = {}) {
      const { data } = await axiosInstance.get('/jobs/saved/list', { params });
      return data.data ?? { jobs: [], pagination: {} };
    },
    async getById(id, incrementView = false) {
      const { data } = await axiosInstance.get(`/jobs/${id}`, { params: incrementView ? { view: '1' } : {} });
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/jobs', {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        salaryMin: payload.salaryMin ?? payload.salary_min,
        salaryMax: payload.salaryMax ?? payload.salary_max,
        salaryCurrency: payload.salaryCurrency ?? payload.salary_currency ?? 'XOF',
        jobType: payload.jobType ?? payload.job_type,
        category: payload.category,
        country: payload.country,
        expiresAt: payload.expiresAt ?? payload.expires_at,
        isPremium: payload.isPremium ?? payload.is_premium,
        isUrgent: payload.isUrgent ?? payload.is_urgent,
        phone: payload.phone,
      });
      return data.data;
    },
    async apply(id, coverLetter, resumeUrl) {
      const { data } = await axiosInstance.post(`/jobs/${id}/apply`, { coverLetter, resumeUrl });
      return data.data;
    },
    async updateApplicationStatus(applicationId, status) {
      const { data } = await axiosInstance.put(`/jobs/applications/${applicationId}/status`, { status });
      return data.data;
    },
    async rateCompany(toUserId, jobId, rating, comment) {
      const { data } = await axiosInstance.post('/jobs/rate/company', { toUserId, jobId, rating, comment });
      return data.data;
    },
    async rateCandidate(toUserId, jobId, rating, comment) {
      const { data } = await axiosInstance.post('/jobs/rate/candidate', { toUserId, jobId, rating, comment });
      return data.data;
    },
    async save(id) {
      await axiosInstance.post(`/jobs/${id}/save`);
    },
    async unsave(id) {
      await axiosInstance.delete(`/jobs/${id}/save`);
    },
    async report(id, reason, description) {
      const { data } = await axiosInstance.post(`/jobs/${id}/report`, { reason, description });
      return data.data;
    },
  },

  // ========== Super-app (vos propres appels API backend) ==========
  transport: {
    rides: {
      async list(params = {}) {
        const { data } = await axiosInstance.get('/rides', { params });
        return data.data ?? { rides: [], pagination: {} };
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/rides/${id}`);
        return data.data;
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/rides', payload);
        return data.data;
      },
      async updateStatus(id, status) {
        const { data } = await axiosInstance.patch(`/rides/${id}/status`, { status });
        return data.data;
      },
    },
    drivers: {
      async listNearby(params = {}) {
        const { data } = await axiosInstance.get('/drivers/nearby', { params });
        return data.data ?? { drivers: [] };
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/drivers/${id}`);
        return data.data;
      },
      async getMyProfile() {
        const { data } = await axiosInstance.get('/drivers/me');
        return data.data;
      },
      async updateProfile(payload) {
        const { data } = await axiosInstance.put('/drivers/me', payload);
        return data.data;
      },
    },
  },
  food: {
    restaurants: {
      async list(params = {}) {
        const { data } = await axiosInstance.get('/restaurants', { params });
        return data.data ?? { restaurants: [], pagination: {} };
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/restaurants/${id}`);
        return data.data;
      },
      async getPending() {
        const { data } = await axiosInstance.get('/restaurants/admin/pending');
        return data.data ?? [];
      },
      async approve(id) {
        const { data } = await axiosInstance.post(`/restaurants/${id}/approve`);
        return data.data;
      },
      async reject(id, reason) {
        const { data } = await axiosInstance.post(`/restaurants/${id}/reject`, { reason });
        return data.data;
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/restaurants', payload);
        return data.data;
      },
    },
    menuItems: {
      async listByRestaurant(restaurantId, params = {}) {
        const { data } = await axiosInstance.get(`/restaurants/${restaurantId}/menu-items`, { params });
        return data.data;
      },
    },
    orders: {
      async list(params = {}) {
        const { data } = await axiosInstance.get('/food-orders', { params });
        return data.data ?? { orders: [], pagination: {} };
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/food-orders', payload);
        return data.data;
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/food-orders/${id}`);
        return data.data;
      },
    },
  },
  utilities: {
    airtime: {
      async recharge(payload) {
        const { data } = await axiosInstance.post('/airtime/recharge', payload);
        return data.data;
      },
      async listMy(params = {}) {
        const { data } = await axiosInstance.get('/airtime/recharges', { params });
        return data.data ?? { recharges: [], pagination: {} };
      },
    },
    bills: {
      async pay(payload) {
        const { data } = await axiosInstance.post('/bills/pay', payload);
        return data.data;
      },
      async listMy(params = {}) {
        const { data } = await axiosInstance.get('/bills/payments', { params });
        return data.data ?? { payments: [], pagination: {} };
      },
    },
  },
  tickets: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/tickets', { params });
      return data.data ?? { tickets: [], pagination: {} };
    },
    async getMyTickets(params = {}) {
      const { data } = await axiosInstance.get('/tickets/my', { params });
      return data.data ?? [];
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/tickets/${id}`);
      return data.data;
    },
    async purchase(payload) {
      const { data } = await axiosInstance.post('/tickets/purchase', payload);
      return data.data;
    },
  },
  health: {
    doctors: {
      async list(params = {}) {
        const { data } = await axiosInstance.get('/doctors', { params });
        return data.data ?? { doctors: [], pagination: {} };
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/doctors/${id}`);
        return data.data;
      },
      async getPending() {
        const { data } = await axiosInstance.get('/doctors/admin/pending');
        return data.data ?? [];
      },
      async approve(id) {
        const { data } = await axiosInstance.post(`/doctors/${id}/approve`);
        return data.data;
      },
      async reject(id, reason) {
        const { data } = await axiosInstance.post(`/doctors/${id}/reject`, { reason });
        return data.data;
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/doctors', payload);
        return data.data;
      },
    },
    appointments: {
      async list(params = {}) {
        const { data } = await axiosInstance.get('/appointments', { params });
        return data.data ?? { appointments: [], pagination: {} };
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/appointments', payload);
        return data.data;
      },
      async getById(id) {
        const { data } = await axiosInstance.get(`/appointments/${id}`);
        return data.data;
      },
    },
  },
  pharmacies: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/pharmacies', { params });
      return data.data ?? { pharmacies: [], pagination: {} };
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/pharmacies/${id}`);
      return data.data;
    },
  },
  properties: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/properties', { params });
      return data.data ?? { properties: [], pagination: {} };
    },
    async getPending() {
      const { data } = await axiosInstance.get('/properties/admin/pending');
      return data.data ?? [];
    },
    async approve(id) {
      const { data } = await axiosInstance.post(`/properties/${id}/approve`);
      return data.data;
    },
    async reject(id, reason) {
      const { data } = await axiosInstance.post(`/properties/${id}/reject`, { reason });
      return data.data;
    },
    async getById(id) {
      const { data } = await axiosInstance.get(`/properties/${id}`);
      return data.data;
    },
    async create(payload) {
      const { data } = await axiosInstance.post('/properties', payload);
      return data.data;
    },
    async createVisitRequest(propertyId, payload) {
      const { data } = await axiosInstance.post(`/properties/${propertyId}/visit-request`, payload);
      return data.data;
    },
    async getMyVisitRequests() {
      const { data } = await axiosInstance.get('/properties/visit-requests/me');
      return data.data ?? [];
    },
  },
  insurance: {
    policies: {
      async listMy(params = {}) {
        const { data } = await axiosInstance.get('/insurance/policies', { params });
        return data.data ?? [];
      },
      async subscribe(payload) {
        const { data } = await axiosInstance.post('/insurance/policies', payload);
        return data.data;
      },
    },
    claims: {
      async listMy(params = {}) {
        const { data } = await axiosInstance.get('/insurance/claims', { params });
        return data.data;
      },
      async create(payload) {
        const { data } = await axiosInstance.post('/insurance/claims', payload);
        return data.data;
      },
    },
    quoteRequests: {
      async create(payload) {
        const { data } = await axiosInstance.post('/insurance/quote-requests', payload);
        return data.data;
      },
    },
    providers: {
      async list() {
        const { data } = await axiosInstance.get('/insurance/providers');
        return data.data ?? [];
      },
      async getPending() {
        const { data } = await axiosInstance.get('/insurance/providers/admin/pending');
        return data.data ?? [];
      },
      async register(payload) {
        const { data } = await axiosInstance.post('/insurance/providers', payload);
        return data.data;
      },
      async approve(id) {
        const { data } = await axiosInstance.post(`/insurance/providers/${id}/approve`);
        return data.data;
      },
      async reject(id, reason) {
        const { data } = await axiosInstance.post(`/insurance/providers/${id}/reject`, { reason });
        return data.data;
      },
    },
  },
  matching: {
    async getOnboarding() {
      const { data } = await axiosInstance.get('/matching/onboarding');
      return data.data;
    },
    async saveOnboarding(payload) {
      const { data } = await axiosInstance.post('/matching/onboarding', payload || {});
      return data.data;
    },
    async previewJourney(payload) {
      const { data } = await axiosInstance.post('/matching/journey/preview', payload || {});
      return data.data;
    },
    async getOpportunities(limit = 20) {
      const { data } = await axiosInstance.get('/matching/opportunities-for-you', { params: { limit } });
      return data.data;
    },
    async getOpportunitiesWithProfile(payload, limit = 20) {
      const { data } = await axiosInstance.post('/matching/opportunities-for-you', payload || {}, { params: { limit } });
      return data.data;
    },
    async getInterconnections() {
      const { data } = await axiosInstance.get('/matching/interconnections');
      return data.data || [];
    },
    async getDashboard() {
      const { data } = await axiosInstance.get('/matching/dashboard');
      return data.data;
    },
    async getKpiSummary(windowDays = 30) {
      const { data } = await axiosInstance.get('/matching/kpi-summary', { params: { windowDays } });
      return data.data;
    },
    async getCoach() {
      const { data } = await axiosInstance.get('/matching/coach');
      return data.data;
    },
    async getCoachHistory(limit = 20) {
      const { data } = await axiosInstance.get('/matching/coach/history', { params: { limit } });
      return data.data || [];
    },
    async chatWithCoach(message) {
      const { data } = await axiosInstance.post('/matching/coach/chat', { message });
      return data.data;
    },
    async getTrustStatus() {
      const { data } = await axiosInstance.get('/matching/trust-status');
      return data.data;
    },
    async getLocalization() {
      const { data } = await axiosInstance.get('/matching/localization');
      return data.data;
    },
    async getProgression() {
      const { data } = await axiosInstance.get('/matching/progression');
      return data.data;
    },
    async getSmartNotifications() {
      const { data } = await axiosInstance.get('/matching/smart-notifications');
      return data.data || [];
    },
    async trackOpportunityAction(payload) {
      const { data } = await axiosInstance.post('/matching/opportunity-action', payload || {});
      return data.data;
    },
  },
  travel: {
    async listHotels(params = {}) {
      const { data } = await axiosInstance.get('/travel/hotels', { params });
      return data.data ?? { items: [], total: 0, page: 1, limit: 20 };
    },
    async listFlights(params = {}) {
      const { data } = await axiosInstance.get('/travel/flights', { params });
      return data.data ?? { items: [], total: 0, page: 1, limit: 20 };
    },
    async bookHotel(payload) {
      const { data } = await axiosInstance.post('/travel/bookings/hotel', payload);
      return data.data;
    },
    async bookFlight(payload) {
      const { data } = await axiosInstance.post('/travel/bookings/flight', payload);
      return data.data;
    },
    async getMyBookings(params = {}) {
      const { data } = await axiosInstance.get('/travel/bookings', { params });
      return data.data ?? { items: [], total: 0, page: 1, limit: 20 };
    },
  },
  ai: {
    async assistant(message) {
      const { data } = await axiosInstance.post('/ai/assistant', { message });
      return data.data ?? { reply: '', data: null };
    },
  },
  mapPlaces: {
    async listNearby(params = {}) {
      const { data } = await axiosInstance.get('/map-places', { params });
      return data.data ?? { items: [], total: 0 };
    },
  },
  cloud: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/cloud', { params });
      return data.data ?? { items: [], total: 0, page: 1, limit: 50 };
    },
    async upload(file, folder = '') {
      const form = new FormData();
      form.append('file', file);
      if (folder) form.append('folder', folder);
      const { data } = await axiosInstance.post('/cloud/upload', form, { ...uploadConfig(), timeout: 120000 });
      return data.data;
    },
    async delete(fileId) {
      const { data } = await axiosInstance.delete(`/cloud/${fileId}`);
      return data;
    },
  },
};

export default api;
