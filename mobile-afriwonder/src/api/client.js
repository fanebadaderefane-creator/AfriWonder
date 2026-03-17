import axios from 'axios';

// Même logique que le front web : on fournit une URL de base
// type https://api.afriwonder.com ou https://backend.afriwonder.com/api
// et on normalise pour toujours terminer par /api
const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  // L'app restera utilisable en mode "maquette" mais les appels réseau échoueront
  // tant que EXPO_PUBLIC_API_URL n'est pas défini dans les env Expo.
  console.warn(
    '[AfriWonder] EXPO_PUBLIC_API_URL n’est pas défini. ' +
      'Configurez-le pour que le client API puisse joindre le backend.',
  );
}

export const API_URL = raw ? `${raw.replace(/\/api\/?$/, '')}/api` : undefined;

// En dev, prévenir si l'URL est localhost sur un appareil réel (Android ne peut pas joindre localhost du PC)
if (typeof __DEV__ !== 'undefined' && __DEV__ && API_URL) {
  const u = API_URL.replace(/\/api\/?$/, '');
  if (u.includes('localhost') || u.includes('127.0.0.1')) {
    console.warn(
      '[AfriWonder] EXPO_PUBLIC_API_URL pointe vers localhost. Sur un téléphone Android réel, ' +
        "utilisez l'IP de votre PC (ex: http://192.168.1.x:3000). Sur l'émulateur, utilisez http://10.0.2.2:3000. Voir .env.example."
    );
  }
}

/**
 * Retourne l'URL de lecture d'une vidéo pour le mobile.
 * Pour les URLs externes (CDN ou réseaux sociaux), on passe par le proxy backend
 * `/proxy/media` afin d'éviter les problèmes CORS / formats non supportés.
 */
/**
 * URL de lecture vidéo pour le mobile.
 * On passe TOUJOURS par le proxy backend quand API_URL est défini, pour éviter
 * CORS, mixed content et problèmes de Range sur mobile/navigateur.
 */
export function getVideoPlaybackUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return videoUrl || '';
  const trimmed = videoUrl.trim();
  if (!trimmed) return '';

  if (!API_URL) return trimmed;

  // URL relative → absolue d'abord, puis on proxy
  let absoluteUrl = trimmed;
  if (trimmed.startsWith('/') || !trimmed.startsWith('http')) {
    const base = API_URL.replace(/\/api\/?$/, '');
    absoluteUrl = trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
  }

  const base = API_URL.replace(/\/$/, '');
  return `${base}/proxy/media?url=${encodeURIComponent(absoluteUrl)}`;
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token) {
  if (token) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common.Authorization;
  }
}

export const api = {
  auth: {
    async login(email, password) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /auth/login');
      }
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      // Backend AfriWonder : { data: { accessToken, refreshToken, user } }
      return data.data;
    },
    async me() {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /auth/me');
      }
      const { data } = await axiosInstance.get('/auth/me');
      return data.data;
    },
    async updateMe(userData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put('/users/me', userData);
      return data?.data ?? data;
    },
  },

  /** Recherche globale CDC : un seul appel pour vidéos, utilisateurs, produits */
  search: {
    async global(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
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
      return data?.data ?? data;
    },
    async suggest(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/search/suggest', {
        params: { q: params.q ?? params.query ?? '', limit: params.limit ?? 8 },
      });
      return data?.data ?? data;
    },
  },

  feed: {
    async list(params = {}, config = {}) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /feed');
      }
      const timeout = config.timeout ?? 12000;
      const res = await axiosInstance.get('/feed', { params, timeout });
      const data = res?.data;
      // Backend renvoie { success, data: { items, pagination } }
      const payload = data?.data ?? data ?? {};
      const items = payload?.items ?? payload?.data?.items ?? (Array.isArray(payload) ? payload : []);
      const pagination = payload?.pagination ?? payload?.data?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 };
      return { items: Array.isArray(items) ? items : [], pagination };
    },
  },

  videos: {
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/videos', { params });
      const out = data?.data ?? data;
      return Array.isArray(out) ? { videos: out } : out;
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/videos/${id}`);
      return data?.data ?? data;
    },
    async like(id) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/:id/like');
      }
      const { data } = await axiosInstance.post(`/videos/${id}/like`);
      return data.data;
    },
    async recordView(id, payload = {}) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/:id/view');
      }
      await axiosInstance.post(`/videos/${id}/view`, payload);
    },
    async getComments(id, params = {}) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/:id/comments');
      }
      const { data } = await axiosInstance.get(`/videos/${id}/comments`, { params });
      return data.data;
    },
    async comment(id, content, parentId = null) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/:id/comment');
      }
      const { data } = await axiosInstance.post(`/videos/${id}/comment`, { content, parentId });
      return data.data;
    },
    async updateComment(commentId, content) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/comments/:commentId');
      }
      const { data } = await axiosInstance.patch(`/videos/comments/${commentId}`, { content });
      return data.data;
    },
    async deleteComment(commentId) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/comments/:commentId');
      }
      await axiosInstance.delete(`/videos/comments/${commentId}`);
    },
    async share(id) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /videos/:id/share');
      }
      const { data } = await axiosInstance.post(`/videos/${id}/share`);
      return data.data;
    },
    async tip(id, { amount, phone, message }) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/videos/${id}/tip`, { amount, phone, message });
      return data?.data ?? data;
    },
    async tipWithWallet(id, { amount, message }) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/videos/${id}/tip-wallet`, { amount, message });
      return data?.data ?? data;
    },
    async create(videoData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/videos', videoData);
      return data?.data ?? data;
    },
    async update(id, videoData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put(`/videos/${id}`, videoData);
      return data?.data ?? data;
    },
    async delete(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.delete(`/videos/${id}`);
    },
  },
  saves: {
    async toggle(id) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /saves/:id/toggle');
      }
      const { data } = await axiosInstance.post(`/saves/${id}/toggle`);
      return data.data;
    },
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/saves', { params: { page: 1, limit: 0, ...params } });
      const out = data?.data ?? data;
      return out?.videos ? out : { videos: Array.isArray(out) ? out : [] };
    },
  },
  users: {
    async getFollowing(id, params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/users/${id}/following`, { params });
      const out = data?.data ?? data;
      return Array.isArray(out) ? { following: out } : out;
    },
    async getLikedVideos(id, params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/users/${id}/liked-videos`, {
        params: { page: 1, limit: params.limit !== undefined ? params.limit : 0 },
      });
      const out = data?.data ?? data;
      const list = out?.videos ?? (Array.isArray(out) ? out : []);
      return list;
    },
    async toggleWonder(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/users/${id}/wonder`);
      return data.data;
    },
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/users', { params });
      const out = data?.data ?? data;
      return Array.isArray(out) ? out : (out?.users || []);
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/users/${id}`);
      return data?.data ?? data;
    },
    async getStats(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/users/${id}/stats`);
      return data?.data ?? data;
    },
    async getFollowers(id, params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/users/${id}/followers`, { params });
      return data?.data ?? data;
    },
  },
  notifications: {
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/notifications', { params });
      const out = data?.data ?? data;
      return Array.isArray(out) ? out : (out?.notifications || []);
    },
    async markAsRead(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.put(`/notifications/${id}/read`);
    },
    async markAllAsRead() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.put('/notifications/read-all');
    },
  },
  messages: {
    async getConversations(page = 1, limit = 50) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/messages/conversations', { params: { page, limit } });
      return data?.data ?? data;
    },
    async getConversation(userId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/messages/conversation/${userId}`);
      return data?.data ?? data;
    },
    async getMessages(conversationId, cursor = null, limit = 30) {
      const params = { limit };
      if (cursor) params.cursor = cursor;
      const { data } = await axiosInstance.get(`/messages/${conversationId}`, { params });
      return data?.data ?? data;
    },
    async send(recipientId, content, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/messages/send', {
        recipientId,
        content: content ?? '',
        type: options.type || 'text',
        media_url: options.media_url,
        thumbnail_url: options.thumbnail_url,
      });
      return data?.data ?? data;
    },
    async markAsRead(conversationId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.put(`/messages/${conversationId}/read`);
    },
    // Groupes (CDC)
    async getGroups() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/messages/groups');
      return data?.data ?? data ?? [];
    },
    async createGroup(name, memberIds = []) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/messages/groups', { name, memberIds });
      return data?.data ?? data;
    },
    async getGroup(groupId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/messages/group/${groupId}`);
      return data?.data ?? data;
    },
    async getGroupMessages(groupId, cursor = null, limit = 30) {
      const params = { limit };
      if (cursor) params.cursor = cursor;
      const { data } = await axiosInstance.get(`/messages/group/${groupId}/messages`, { params });
      return data?.data ?? data;
    },
    async sendGroupMessage(groupId, content, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/messages/group/${groupId}/send`, {
        content: content ?? '',
        type: options.type || 'text',
        media_url: options.media_url,
      });
      return data?.data ?? data;
    },
  },
  upload: {
    async image(fileInput) {
      const file = fileInput?.uri ? fileInput : (fileInput?.file ?? fileInput);
      if (!file?.uri) throw new Error('Fichier image invalide');
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `image_${Date.now()}.jpg`,
      });
      const { data } = await axiosInstance.post('/upload/image', formData, {
        transformRequest: [(body, headers) => { delete headers['Content-Type']; return body; }],
      });
      const result = data?.data ?? data;
      return result?.file_url != null ? result : { file_url: result?.file_url ?? result?.url };
    },
    async video(fileInput, onProgress) {
      const file = fileInput?.uri ? fileInput : (fileInput?.file ?? fileInput);
      if (!file?.uri) throw new Error('Fichier vidéo invalide');
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'video/mp4',
        name: file.name || `video_${Date.now()}.mp4`,
      });
      const { data } = await axiosInstance.post('/upload/video', formData, {
        transformRequest: [(body, headers) => { delete headers['Content-Type']; return body; }],
        timeout: 300000,
        onUploadProgress: (e) => {
          const total = e.total || 1;
          const pct = Math.min(100, Math.round((e.loaded * 100) / total));
          onProgress?.(pct);
        },
      });
      const result = data?.data ?? data;
      const fileUrl = result?.file_url ?? result?.url;
      return fileUrl != null ? { file_url: fileUrl } : (result || {});
    },
  },
  live: {
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live', { params });
      const out = data?.data ?? data;
      return out?.streams ?? out;
    },
    async getDiscovery(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/discovery', { params });
      return data?.data ?? data;
    },
    async getRecommendations(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/recommendations', { params });
      return data?.data ?? data;
    },
    async getCategories() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/categories');
      return data?.data ?? data;
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/live/${id}`);
      return data?.data ?? data;
    },
    async start(liveData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/live/start', {
        title: liveData.title,
        description: liveData.description,
        category: liveData.category,
        language: liveData.language || 'fr',
        status: liveData.status,
        scheduled_at: liveData.scheduled_at,
        goal_target: liveData.goal_target ?? (liveData.goalAmount > 0 ? liveData.goalAmount : undefined),
      });
      return data?.data ?? data;
    },
    async startScheduled(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/start-scheduled`);
      return data?.data ?? data;
    },
    async getAgoraStatus() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/agora-status');
      return data?.data ?? data;
    },
    async getStreamToken(id, role = 'audience') {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/live/${id}/token`, { params: { role } });
      return data?.data ?? data;
    },
    async end(id, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/end`, options);
      return data?.data ?? data;
    },
    async sendChatMessage(id, message) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/chat`, { message });
      return data?.data ?? data;
    },
    async getWallet() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/wallet');
      return data?.data ?? data;
    },
    async joinViewer(id, sessionId, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/join`, { sessionId, country: options.country });
      return data?.data ?? data;
    },
    async leaveViewer(id, sessionId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.post(`/live/${id}/leave`, { sessionId });
    },
    async heartbeat(id, sessionId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.post(`/live/${id}/heartbeat`, { sessionId });
    },
    async sendTip(id, payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/tip`, payload);
      return data?.data ?? data;
    },
    async sendGift(id, giftData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/gift`, giftData);
      return data?.data ?? data;
    },
    async getGifts(category) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/live/gifts', { params: category ? { category } : {} });
      return data?.data ?? data;
    },
    async like(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/like`);
      return data?.data ?? data;
    },
    async reaction(id, type = 'like') {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/reaction`, { type });
      return data?.data ?? data;
    },
    async subscribeToCreator(creatorId, amount = 500) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/creator/${creatorId}/subscribe`, { amount });
      return data?.data ?? data;
    },
    async getPolls(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/live/${id}/polls`);
      return data?.data ?? data;
    },
    async createPoll(id, pollData) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/polls`, pollData);
      return data?.data ?? data;
    },
    async votePoll(id, pollId, optionIndex) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/polls/${pollId}/vote`, { optionIndex });
      return data?.data ?? data;
    },
    async endPoll(id, pollId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/polls/${pollId}/end`);
      return data?.data ?? data;
    },
    async updateChatMessage(id, messageId, updates) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.patch(`/live/${id}/chat/${messageId}`, updates);
      return data?.data ?? data;
    },
    async ban(id, payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/ban`, payload);
      return data?.data ?? data;
    },
    async report(id, reason, description) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/moderation/report', {
        contentType: 'live',
        contentId: id,
        reason,
        description,
      });
      return data?.data ?? data;
    },
    async inviteCoHost(id, userId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/live/${id}/cohost/invite`, { userId });
      return data?.data ?? data;
    },
  },
  creatorSupport: {
    async support(creatorId, payload) {
      if (!API_URL) {
        throw new Error('EXPO_PUBLIC_API_URL doit être configuré pour appeler /creator-support/:id');
      }
      const { data } = await axiosInstance.post(`/creator-support/${creatorId}`, payload);
      return data.data;
    },
  },
  ads: {
    async recordImpression(creativeId, campaignId, deviceId) {
      if (!API_URL) return;
      await axiosInstance.post('/ads/impression', {
        creative_id: creativeId,
        campaign_id: campaignId,
        device_id: deviceId,
      });
    },
    async recordClick(creativeId, campaignId, deviceId) {
      if (!API_URL) return;
      await axiosInstance.post('/ads/click', {
        creative_id: creativeId,
        campaign_id: campaignId,
        device_id: deviceId,
      });
    },
    async reportAd(campaignId, reason) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      await axiosInstance.post('/ads/report', { campaign_id: campaignId, reason });
    },
    async getCampaigns(params = {}) {
      if (!API_URL) return { campaigns: [], pagination: { page: 1, totalPages: 1, total: 0 } };
      const { data } = await axiosInstance.get('/ads/campaigns', { params });
      return data?.data ?? data ?? { campaigns: [], pagination: { page: 1, totalPages: 1, total: 0 } };
    },
    async updateCampaign(id, payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.patch(`/ads/campaigns/${id}`, payload);
      return data?.data ?? data;
    },
  },
  viewHistory: {
    async list(params = {}) {
      if (!API_URL) return [];
      const { data } = await axiosInstance.get('/view-history', { params });
      return data?.data ?? data ?? [];
    },
    async record(videoId, watchTimeSeconds = 0, watchPercent = null) {
      if (!API_URL) return;
      await axiosInstance.post('/view-history', {
        video_id: videoId,
        watch_time_seconds: watchTimeSeconds,
        ...(watchPercent != null && { watch_percent: watchPercent }),
      });
    },
  },
  courses: {
    async list(params = {}) {
      if (!API_URL) return { courses: [] };
      const { data } = await axiosInstance.get('/courses', { params });
      return data?.data ?? data ?? { courses: [] };
    },
    async getById(id) {
      if (!API_URL) return null;
      try {
        const { data } = await axiosInstance.get(`/courses/${id}`);
        return data?.data ?? data;
      } catch {
        return null;
      }
    },
    async enroll(id, payload = {}) {
      if (!API_URL) return {};
      const { data } = await axiosInstance.post(`/courses/${id}/enroll`, payload);
      return data?.data ?? data ?? {};
    },
  },
  formations: {
    async list(params = {}) {
      return api.courses.list(params);
    },
  },
  events: {
    async list(params = {}) {
      if (!API_URL) return { events: [] };
      const { data } = await axiosInstance.get('/events', { params });
      return data?.data ?? data ?? { events: [] };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/events/${id}`);
      return data?.data ?? data;
    },
    async create(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/events', payload);
      return data?.data ?? data;
    },
    async getMyTickets() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/events/my-tickets');
      return data?.data ?? data;
    },
  },
  platform: {
    async getFeatureFlags() {
      if (!API_URL) return {};
      const { data } = await axiosInstance.get('/platform/feature-flags');
      return data?.data ?? {};
    },
    async getConfig() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/platform/config');
      return data?.data ?? data;
    },
    async getStats() {
      if (!API_URL) return {};
      const { data } = await axiosInstance.get('/platform/stats');
      return data?.data ?? data ?? {};
    },
  },
  products: {
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/products', { params });
      return data?.data ?? data ?? { products: [] };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/products/${id}`);
      return data?.data ?? data;
    },
    async getHighlights(params = {}) {
      if (!API_URL) return { trending: [], newest: [] };
      const { data } = await axiosInstance.get('/products/highlights', { params: { trending_limit: params?.trendingLimit ?? 8, new_limit: params?.newLimit ?? 8 } });
      return data?.data ?? { trending: [], newest: [] };
    },
  },
  cart: {
    async get() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/cart');
      return data?.data ?? data;
    },
    async add(productId, quantity = 1) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/cart/add', { productId, quantity });
      return data?.data ?? data;
    },
    async remove(productId) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.delete(`/cart/remove/${productId}`);
      return data?.data ?? data;
    },
    async update(productId, quantity) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put('/cart/update', { productId, quantity });
      return data?.data ?? data;
    },
    async clear() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.delete('/cart/clear');
      return data?.data ?? data;
    },
  },
  commissions: {
    async getConfig() {
      if (!API_URL) return {};
      const { data } = await axiosInstance.get('/commissions');
      return data?.data ?? data ?? {};
    },
  },
  support: {
    async createTicket(subject, message) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/support/tickets', { subject, message });
      return data?.data ?? data;
    },
    async listTickets(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/support/tickets', { params });
      return data?.data ?? data;
    },
    async getTicket(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/support/tickets/${id}`);
      return data?.data ?? data;
    },
    async addMessage(ticketId, message) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/support/tickets/${ticketId}/messages`, { message });
      return data?.data ?? data;
    },
    tickets: {
      list: async (params = {}) => {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.get('/support/tickets', { params });
        return data?.data ?? data;
      },
      getById: async (id) => {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.get(`/support/tickets/${id}`);
        return data?.data ?? data;
      },
    },
  },
  payments: {
    async getWallet() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/payments/wallet');
      return data?.data ?? data;
    },
    async addToWallet(amount, description) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/payments/wallet/deposit', { amount, description });
      return data?.data ?? data;
    },
    async withdrawFromWallet(amount, description, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/payments/wallet/withdraw', {
        amount,
        description,
        pin: options.pin,
      });
      return data?.data ?? data;
    },
    async payOrderWithWallet(orderId, pin) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/payments/wallet/pay-order', { orderId, pin });
      return data?.data ?? data;
    },
    async getWalletSecurity() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/payments/wallet/security');
      return data?.data ?? data;
    },
    async setWalletPin(pin) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/payments/wallet/set-pin', { pin });
      return data?.data ?? data;
    },
    async validateWalletPin(pin) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/payments/wallet/validate-pin', { pin });
      return data?.data ?? data;
    },
    async getTransactions(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/payments/transactions', { params });
      return data?.data ?? data;
    },
  },
  withdrawals: {
    async request(amount, phoneOrOrange, options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
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
      return data?.data ?? data;
    },
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/withdrawals', { params });
      return data?.data ?? data;
    },
    async getPending(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/withdrawals/pending', { params });
      return data?.data ?? data;
    },
    async process(id, payload = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/withdrawals/${id}/process`, payload);
      return data?.data ?? data;
    },
    async cancel(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/withdrawals/${id}/cancel`);
      return data?.data ?? data;
    },
  },
  me: {
    async getVirtualCards() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/me/virtual-cards');
      const out = data?.data ?? data;
      return out ?? [];
    },
    async createVirtualCard(options = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/me/virtual-cards', options);
      return data?.data ?? data;
    },
    async revokeVirtualCard(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.delete(`/me/virtual-cards/${id}`);
      return data?.data ?? data;
    },
    async getInternationalTransfers(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/me/international-transfers', { params });
      const out = data?.data ?? data;
      return {
        items: out?.items ?? out?.data ?? out ?? [],
        pagination: out?.pagination ?? {},
      };
    },
    async createInternationalTransfer(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/me/international-transfers', payload);
      return data?.data ?? data;
    },
    async getInternationalTransfer(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/me/international-transfers/${id}`);
      return data?.data ?? data;
    },
    async getPreauths(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/me/preauths', { params });
      const out = data?.data ?? data;
      return {
        items: out?.items ?? out?.data ?? out ?? [],
        pagination: out?.pagination ?? {},
      };
    },
    async createPreauth(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/me/preauths', payload);
      return data?.data ?? data;
    },
  },
  orders: {
    async list(params = {}) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/orders', { params });
      return data?.data ?? data;
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/orders/${id}`);
      return data?.data ?? data;
    },
  },
  microcredit: {
    async list(params = {}) {
      if (!API_URL) return { loans: [] };
      const { data } = await axiosInstance.get('/microcredit', { params: { page: params?.page ?? 1, limit: params?.limit ?? 20 } });
      return data?.data ?? data ?? { loans: [] };
    },
  },
  crowdfunding: {
    async list(params = {}) {
      if (!API_URL) return { campaigns: [] };
      const { data } = await axiosInstance.get('/crowdfunding', { params });
      return data?.data ?? data ?? { campaigns: [] };
    },
  },
  news: {
    async getFeed(page = 1, limit = 20) {
      if (!API_URL) return { articles: [] };
      const { data } = await axiosInstance.get('/news/feed', { params: { page, limit } });
      return data?.data ?? data ?? { articles: [] };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/news/${id}`);
      return data?.data ?? data;
    },
  },
  jobs: {
    async list(params = {}) {
      if (!API_URL) return { jobs: [] };
      const { data } = await axiosInstance.get('/jobs', { params });
      return data?.data ?? data ?? { jobs: [] };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/jobs/${id}`);
      return data?.data ?? data;
    },
  },
  transport: {
    async listRides(params = {}) {
      if (!API_URL) return [];
      const { data } = await axiosInstance.get('/transport/rides', { params });
      return data?.data ?? data ?? [];
    },
    drivers: {
      async listNearby(params = {}) {
        if (!API_URL) return { drivers: [] };
        try {
          const { data } = await axiosInstance.get('/drivers/nearby', { params: { limit: 20, ...params } });
          return data?.data ?? data ?? { drivers: [] };
        } catch (_) {
          return { drivers: [] };
        }
      },
      async updateProfile(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.put('/drivers/me', payload);
        return data?.data ?? data;
      },
    },
  },
  food: {
    restaurants: {
      async list(params = {}) {
        if (!API_URL) return { restaurants: [] };
        try {
          const { data } = await axiosInstance.get('/food/restaurants', { params });
          return data?.data ?? data ?? { restaurants: [] };
        } catch (_) {
          return { restaurants: [] };
        }
      },
      async create(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/food/restaurants', payload);
        return data?.data ?? data;
      },
    },
    menuItems: {
      async listByRestaurant(restaurantId) {
        if (!API_URL) return [];
        try {
          const { data } = await axiosInstance.get(`/food/restaurants/${restaurantId}/menu`);
          const out = data?.data ?? data;
          return Array.isArray(out) ? out : out?.menu_items ?? out?.items ?? [];
        } catch (_) {
          return [];
        }
      },
    },
  },
  health: {
    doctors: {
      async list(params = {}) {
        if (!API_URL) return { doctors: [] };
        try {
          const { data } = await axiosInstance.get('/health/doctors', { params });
          const out = data?.data ?? data;
          return out?.doctors != null ? out : { doctors: Array.isArray(out) ? out : [] };
        } catch (_) {
          return { doctors: [] };
        }
      },
      async create(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/health/doctors', payload);
        return data?.data ?? data;
      },
    },
    appointments: {
      async create(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/health/appointments', payload);
        return data?.data ?? data;
      },
    },
  },
  utilities: {
    airtime: {
      async listMy(params = {}) {
        if (!API_URL) return { recharges: [] };
        try {
          const { data } = await axiosInstance.get('/airtime/recharges', { params });
          return data?.data ?? data ?? { recharges: [] };
        } catch (_) {
          return { recharges: [] };
        }
      },
      async recharge(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/airtime/recharge', payload);
        return data?.data ?? data;
      },
    },
    bills: {
      async listMy(params = {}) {
        if (!API_URL) return { payments: [] };
        try {
          const { data } = await axiosInstance.get('/bills/payments', { params });
          return data?.data ?? data ?? { payments: [] };
        } catch (_) {
          return { payments: [] };
        }
      },
      async pay(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/bills/pay', payload);
        return data?.data ?? data;
      },
    },
  },
  properties: {
    async list(params = {}) {
      if (!API_URL) return { properties: [], pagination: {} };
      const { data } = await axiosInstance.get('/properties', { params });
      const out = data?.data ?? data;
      const list = out?.properties ?? (Array.isArray(out) ? out : []);
      return { properties: list, pagination: out?.pagination ?? { total: list.length, totalPages: 1 } };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/properties/${id}`);
      return data?.data ?? data;
    },
    async create(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/properties', payload);
      return data?.data ?? data;
    },
  },
  insurance: {
    policies: {
      async listMy() {
        if (!API_URL) return [];
        try {
          const { data } = await axiosInstance.get('/insurance/policies/my');
          const out = data?.data ?? data;
          return Array.isArray(out) ? out : out?.policies ?? [];
        } catch (_) {
          return [];
        }
      },
      async subscribe(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/insurance/policies/subscribe', payload);
        return data?.data ?? data;
      },
    },
    providers: {
      async list() {
        if (!API_URL) return [];
        try {
          const { data } = await axiosInstance.get('/insurance/providers');
          const out = data?.data ?? data;
          return Array.isArray(out) ? out : out?.providers ?? [];
        } catch (_) {
          return [];
        }
      },
      async register(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/insurance/providers/register', payload);
        return data?.data ?? data;
      },
    },
    quoteRequests: {
      async create(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/insurance/quote-requests', payload);
        return data?.data ?? data;
      },
    },
    claims: {
      async create(payload) {
        if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
        const { data } = await axiosInstance.post('/insurance/claims', payload);
        return data?.data ?? data;
      },
    },
  },
  news: {
    async list(params = {}) {
      if (!API_URL) return { articles: [], pagination: {} };
      try {
        const { data } = await axiosInstance.get('/news', { params });
        const out = data?.data ?? data;
        return {
          articles: out?.articles ?? (Array.isArray(out) ? out : []),
          pagination: out?.pagination ?? { page: 1, totalPages: 1, total: 0 },
        };
      } catch (_) {
        return { articles: [], pagination: {} };
      }
    },
    async getFeed(page = 1, limit = 20) {
      if (!API_URL) return { articles: [], pagination: {} };
      try {
        const { data } = await axiosInstance.get('/news/feed', { params: { page, limit } });
        const out = data?.data ?? data;
        return {
          articles: out?.articles ?? [],
          pagination: out?.pagination ?? { page: 1, totalPages: 1, total: 0 },
        };
      } catch (_) {
        return { articles: [], pagination: {} };
      }
    },
    async getPreferences() {
      if (!API_URL) return {};
      try {
        const { data } = await axiosInstance.get('/news/preferences');
        return data?.data ?? data ?? {};
      } catch (_) {
        return {};
      }
    },
    async savePreferences(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put('/news/preferences', payload);
      return data?.data ?? data;
    },
    async getBreaking() {
      if (!API_URL) return [];
      try {
        const { data } = await axiosInstance.get('/news/breaking');
        return data?.data ?? data ?? [];
      } catch (_) {
        return [];
      }
    },
    async getTrending(limit = 10) {
      if (!API_URL) return [];
      try {
        const { data } = await axiosInstance.get('/news/trending', { params: { limit } });
        return data?.data ?? data ?? [];
      } catch (_) {
        return [];
      }
    },
    async getByIdOrSlug(idOrSlug) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/news/${idOrSlug}`);
      return data?.data ?? data;
    },
  },
  microcredit: {
    async list(params = {}) {
      if (!API_URL) return { loans: [] };
      try {
        const { data } = await axiosInstance.get('/microcredit', { params: { page: params?.page ?? 1, limit: params?.limit ?? 20, ...params } });
        const out = data?.data ?? data;
        return out?.loans != null ? out : { loans: Array.isArray(out) ? out : [] };
      } catch (_) {
        return { loans: [] };
      }
    },
    async createRequest(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/microcredit/request', payload);
      return data?.data ?? data;
    },
  },
  crowdfunding: {
    async list(params = {}) {
      if (!API_URL) return { campaigns: [] };
      try {
        const { data } = await axiosInstance.get('/crowdfunding', { params });
        const out = data?.data ?? data;
        return out?.campaigns != null ? out : { campaigns: Array.isArray(out) ? out : [] };
      } catch (_) {
        return { campaigns: [] };
      }
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/crowdfunding/${id}`);
      return data?.data ?? data;
    },
    async contribute(campaignId, payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/crowdfunding/${campaignId}/contribute`, payload);
      return data?.data ?? data;
    },
    async create(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/crowdfunding', payload);
      return data?.data ?? data;
    },
  },
  jobs: {
    async list(params = {}) {
      if (!API_URL) return { jobs: [], pagination: {} };
      try {
        const { data } = await axiosInstance.get('/jobs', { params });
        const out = data?.data ?? data;
        return {
          jobs: out?.jobs ?? (Array.isArray(out) ? out : []),
          pagination: out?.pagination ?? { page: 1, totalPages: 1, total: 0 },
        };
      } catch (_) {
        return { jobs: [], pagination: {} };
      }
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/jobs/${id}`);
      return data?.data ?? data;
    },
    async getRecommended(limit = 8) {
      if (!API_URL) return [];
      try {
        const { data } = await axiosInstance.get('/jobs/recommended', { params: { limit } });
        return data?.data ?? data ?? [];
      } catch (_) {
        return [];
      }
    },
    async apply(jobId, coverLetter, resumeUrl) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post(`/jobs/${jobId}/apply`, { cover_letter: coverLetter, resume_url: resumeUrl });
      return data?.data ?? data;
    },
    async create(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/jobs', payload);
      return data?.data ?? data;
    },
    async getCandidateProfile() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/jobs/profile/candidate');
      return data?.data ?? data;
    },
    async updateCandidateProfile(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put('/jobs/profile/candidate', payload);
      return data?.data ?? data;
    },
    async getCompanyProfile() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/jobs/profile/company');
      return data?.data ?? data;
    },
    async updateCompanyProfile(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.put('/jobs/profile/company', payload);
      return data?.data ?? data;
    },
    async getEmployerDashboard() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/jobs/dashboard/employer');
      return data?.data ?? data;
    },
  },
  referrals: {
    async getStats() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/referrals/stats');
      return data?.data ?? data;
    },
    async getCode() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/referrals/code');
      return data?.data?.code;
    },
  },
  creatorDashboard: {
    async getDashboard() {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get('/creator-dashboard');
      return data?.data ?? data;
    },
  },
  leaderboard: {
    async list(params = {}) {
      if (!API_URL) return [];
      const { data } = await axiosInstance.get('/leaderboard', { params });
      return data?.data ?? data ?? [];
    },
  },
  gamification: {
    async getMe() {
      if (!API_URL) return {};
      const { data } = await axiosInstance.get('/gamification/me');
      return data?.data ?? data ?? {};
    },
  },
  analytics: {
    async getStats(params = {}) {
      if (!API_URL) return {};
      const { data } = await axiosInstance.get('/analytics/stats', { params });
      return data?.data ?? data ?? {};
    },
  },
  providers: {
    async list(params = {}) {
      if (!API_URL) return { providers: [] };
      const { data } = await axiosInstance.get('/providers', { params });
      const out = data?.data ?? data;
      const list = out?.providers ?? (Array.isArray(out) ? out : []);
      return Array.isArray(list) ? { providers: list } : { providers: [] };
    },
    async getById(id) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.get(`/providers/${id}`);
      return data?.data ?? data;
    },
    async create(payload) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL requis');
      const { data } = await axiosInstance.post('/providers', payload);
      return data?.data ?? data;
    },
  },
  serviceCategories: {
    async list() {
      if (!API_URL) return [];
      try {
        const { data } = await axiosInstance.get('/service-categories');
        return data?.data ?? data ?? [];
      } catch (_) {
        return [];
      }
    },
  },
};

