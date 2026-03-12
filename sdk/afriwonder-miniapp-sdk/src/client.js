/**
 * Client HTTP AfriWonder Mini-App SDK — CDC Super-App.
 * Utilisable en Node.js et en navigateur (avec bundler ou import map).
 */

const defaultBaseUrl = typeof process !== 'undefined' && process.env?.AFRIWONDER_API_URL
  ? process.env.AFRIWONDER_API_URL
  : 'https://api.afriwonder.com';

/**
 * @typedef {Object} AfriWonderSDKOptions
 * @property {string} [baseUrl] - URL de base de l'API (ex: https://api.afriwonder.com)
 * @property {string} [apiKey] - Clé API publique (X-API-Key) pour /api/public
 * @property {string|(() => Promise<string>)} [token] - JWT Bearer (ou fonction retournant un JWT) pour /api/mini-apps et /api/developer
 */

export class AfriWonderClient {
  /**
   * @param {AfriWonderSDKOptions} options
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || defaultBaseUrl).replace(/\/+$/, '');
    this.apiKey = options.apiKey || null;
    this.token = options.token || null;
  }

  /**
   * Définir le token JWT (ou une fonction async qui retourne le token).
   * @param {string|(() => Promise<string>)} token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Définir la clé API publique.
   * @param {string} apiKey
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async _getToken() {
    if (typeof this.token === 'function') return await this.token();
    return this.token;
  }

  async _request(method, path, body = null, opts = {}) {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = { 'Content-Type': 'application/json', ...opts.headers };

    if (opts.useApiKey && this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else {
      const token = await this._getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (body != null && method !== 'GET') config.body = JSON.stringify(body);

    const res = await fetch(url, config);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data?.data ?? data;
  }

  // ---------- Mini-Apps (authentification JWT utilisateur ou développeur) ----------

  /**
   * Lister les mini-apps (catalogue public).
   * @param {{ category?: string, search?: string, page?: number, limit?: number, featured?: boolean }} [params]
   * @returns {Promise<{ miniApps: any[], pagination?: any }>}
   */
  async listApps(params = {}) {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.featured != null) q.set('featured', String(params.featured));
    const query = q.toString();
    return this._request('GET', `/api/mini-apps${query ? `?${query}` : ''}`);
  }

  /**
   * Détails d'une mini-app.
   * @param {string} appId
   * @returns {Promise<Object>}
   */
  async getApp(appId) {
    return this._request('GET', `/api/mini-apps/${encodeURIComponent(appId)}`);
  }

  /**
   * Installer une mini-app (utilisateur connecté). Nécessite setToken(JWT).
   * @param {string} appId
   * @returns {Promise<Object>}
   */
  async installApp(appId) {
    return this._request('POST', `/api/mini-apps/${encodeURIComponent(appId)}/install`);
  }

  /**
   * Créer une transaction (achat in-app). Nécessite setToken(JWT).
   * @param {string} appId
   * @param {number} amount - Montant en FCFA
   * @param {{ payment_method?: string, description?: string }} [options]
   * @returns {Promise<Object>}
   */
  async createTransaction(appId, amount, options = {}) {
    return this._request('POST', `/api/mini-apps/${encodeURIComponent(appId)}/transaction`, {
      amount,
      payment_method: options.payment_method || 'orange_money',
      description: options.description,
    });
  }

  /**
   * Acheter un boost pour une mini-app (développeur). Nécessite setToken(JWT).
   * @param {string} appId
   * @param {{ boost_type: string, price: number, duration_days?: number, payment_reference?: string }} options
   * @returns {Promise<Object>}
   */
  async purchaseBoost(appId, options) {
    return this._request('POST', `/api/mini-apps/${encodeURIComponent(appId)}/boost`, {
      boost_type: options.boost_type,
      price: options.price,
      duration_days: options.duration_days,
      payment_reference: options.payment_reference,
    });
  }

  /**
   * Créer une mini-app (développeur). Nécessite setToken(JWT).
   * @param {{ name: string, description: string, category: string, icon_url?: string, permissions?: string[], screenshots?: string[], bundle_url?: string, bundle_hash?: string }} data
   * @returns {Promise<Object>}
   */
  async createApp(data) {
    return this._request('POST', '/api/mini-apps', data);
  }

  // ---------- Developer API (JWT développeur) ----------

  /**
   * Lister les mini-apps du développeur connecté.
   * @returns {Promise<Object[]>}
   */
  async getMyApps() {
    return this._request('GET', '/api/developer/apps');
  }

  /**
   * Abonnement développeur actuel.
   * @returns {Promise<Object>}
   */
  async getSubscription() {
    return this._request('GET', '/api/developer/subscription');
  }

  /**
   * Souscrire ou changer d'abonnement (starter | pro | enterprise).
   * @param {string} planType
   * @param {string} [paymentMethod]
   * @returns {Promise<Object>}
   */
  async updateSubscription(planType, paymentMethod) {
    return this._request('POST', '/api/developer/subscription', {
      plan_type: planType,
      payment_method: paymentMethod,
    });
  }

  /**
   * Revenus du développeur.
   * @param {string} [timeRange='month'] - day | week | month | year
   * @returns {Promise<Object>}
   */
  async getRevenue(timeRange = 'month') {
    return this._request('GET', `/api/developer/revenue?time_range=${encodeURIComponent(timeRange)}`);
  }

  /**
   * Demander un retrait de revenus.
   * @param {number} amount
   * @param {string} paymentMethod - orange_money | mtn_money | wave | bank
   * @param {{ phone_number?: string, bank_account?: string }} [options]
   * @returns {Promise<Object>}
   */
  async withdrawRevenue(amount, paymentMethod, options = {}) {
    return this._request('POST', '/api/developer/revenue/withdraw', {
      amount,
      payment_method: paymentMethod,
      phone_number: options.phone_number,
      bank_account: options.bank_account,
    });
  }

  /**
   * Analytics développeur (GMV, commissions, installations).
   * @param {string} [timeRange='month']
   * @returns {Promise<Object>}
   */
  async getAnalytics(timeRange = 'month') {
    return this._request('GET', `/api/developer/analytics?time_range=${encodeURIComponent(timeRange)}`);
  }

  // ---------- Public API (X-API-Key) ----------

  /**
   * Opportunités du matching (API publique). Nécessite setApiKey(clé).
   * @param {{ goal?: string, location?: string, level?: string, skills?: string[], interests?: string[], limit?: number }} [params]
   * @returns {Promise<Object>}
   */
  async getMatchingOpportunities(params = {}) {
    const q = new URLSearchParams();
    if (params.goal) q.set('goal', params.goal);
    if (params.location) q.set('location', params.location);
    if (params.level) q.set('level', params.level);
    if (params.skills?.length) q.set('skills', params.skills.join(','));
    if (params.interests?.length) q.set('interests', params.interests.join(','));
    if (params.limit != null) q.set('limit', String(params.limit));
    const query = q.toString();
    return this._request('GET', `/api/public/v1/matching/opportunities${query ? `?${query}` : ''}`, null, { useApiKey: true });
  }

  /**
   * Usage de l'API publique (quota, appels par endpoint).
   * @param {number} [sinceHours=24]
   * @returns {Promise<Object>}
   */
  async getPublicUsage(sinceHours = 24) {
    return this._request('GET', `/api/public/v1/usage?sinceHours=${encodeURIComponent(sinceHours)}`, null, { useApiKey: true });
  }

  /**
   * Santé de l'API publique.
   * @returns {Promise<Object>}
   */
  async getPublicHealth() {
    return this._request('GET', '/api/public/v1/health', null, { useApiKey: true });
  }
}
