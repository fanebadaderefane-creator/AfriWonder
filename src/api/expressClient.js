import axios from 'axios';
import { getItem, setItem, removeItem } from '@/utils/safeStorage';

// En production sans VITE_API_URL : utiliser le proxy Vercel (/api) → pas de CORS, credentials OK
// Si VITE_API_URL est défini (ex: https://afriwonder.onrender.com), appels directs → CORS requis côté backend (CORS_ORIGIN)
const raw = import.meta.env.VITE_API_URL;
const API_URL = raw
  ? `${raw.replace(/\/api\/?$/, '')}/api`
  : (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export { API_URL };

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Variable pour éviter les refresh multiples simultanés
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
      // Vérifier si la requête avait un token au départ
      const hadToken = originalRequest.headers.Authorization?.startsWith('Bearer ');
      
      if (!hadToken) {
        removeItem('access_token');
        removeItem('refresh_token');
        removeItem('afriwonder_auth_user');
        return Promise.reject(error);
      }

      // Si on est déjà en train de rafraîchir, mettre en queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getItem('refresh_token');
        if (!refreshToken) {
          removeItem('access_token');
          removeItem('refresh_token');
          removeItem('afriwonder_auth_user');
          processQueue(error);
          isRefreshing = false;
          return Promise.reject(error);
        }
        
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;
        setItem('access_token', newToken);
        setItem('refresh_token', data.data.refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        isRefreshing = false;
        
        return axiosInstance(originalRequest);
      } catch (_refreshError) {
        removeItem('access_token');
        removeItem('refresh_token');
        removeItem('afriwonder_auth_user');
        processQueue(_refreshError);
        isRefreshing = false;
        
        // Ne rediriger que si ce n'est pas déjà la page d'accueil
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(_refreshError);
      }
    }
    // Message d'erreur unifié pour affichage (toasts, formulaires)
    const raw = error.response?.data?.message ?? error.response?.data?.error ?? error.message;
    error.apiMessage = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' ? (raw.message || JSON.stringify(raw)) : 'Une erreur est survenue');
    return Promise.reject(error);
  }
);

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
    async login(email, password) {
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      setItem('access_token', data.data.accessToken);
      setItem('refresh_token', data.data.refreshToken);
      return data.data.user;
    },
    async register(userData) {
      const { data } = await axiosInstance.post('/auth/register', userData);
      setItem('access_token', data.data.accessToken);
      setItem('refresh_token', data.data.refreshToken);
      return data.data.user;
    },
    async me() {
      const token = getItem('access_token');
      if (!token) {
        const error = Object.assign(new Error('No token available'), { response: { status: 401 } });
        throw error;
      }
      const { data } = await axiosInstance.get('/auth/me');
      return data.data;
    },
    async logout() {
      removeItem('access_token');
      removeItem('refresh_token');
      removeItem('afriwonder_auth_user');
    },
    async updateMe(userData) {
      const { data } = await axiosInstance.put('/users/me', userData);
      return data.data;
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
    async like(id) {
      const { data } = await axiosInstance.post(`/videos/${id}/like`);
      return data.data;
    },
    async comment(id, content, parentId = null) {
      const { data } = await axiosInstance.post(`/videos/${id}/comment`, { content, parentId });
      return data.data;
    },
    async getComments(id, params = {}) {
      const { data } = await axiosInstance.get(`/videos/${id}/comments`, { params });
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
    async tip(id, { amount, phone, message }) {
      const { data } = await axiosInstance.post(`/videos/${id}/tip`, { amount, phone, message });
      return data.data;
    },
    async tipWithWallet(id, { amount, message }) {
      const { data } = await axiosInstance.post(`/videos/${id}/tip-wallet`, { amount, message });
      return data.data;
    },
  },
  feed: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/feed', { params });
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
    async image(file) {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    async video(file, onProgress) {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percentCompleted);
        },
      });
      return data.data;
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
    async markAsRead(id) {
      await axiosInstance.put(`/notifications/${id}/read`);
    },
    async markAllAsRead() {
      await axiosInstance.put('/notifications/read-all');
    },
  },
  messages: {
    async getConversations(page = 1, limit = 20) {
      const { data } = await axiosInstance.get('/messages/conversations', { params: { page, limit } });
      return data.data;
    },
    async getConversation(userId) {
      const { data } = await axiosInstance.get(`/messages/conversation/${userId}`);
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
      });
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
    async deleteMessage(messageId) {
      const { data } = await axiosInstance.delete(`/messages/message/${messageId}`);
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
    async record(videoId, watchTimeSeconds = 0) {
      const { data } = await axiosInstance.post('/view-history', {
        video_id: videoId,
        watch_time_seconds: watchTimeSeconds,
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
  },
};

export default api;

