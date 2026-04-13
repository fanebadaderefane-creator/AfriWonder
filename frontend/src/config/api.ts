/**
 * Chemins relatifs pour `apiClient` (baseURL = `…/api/proxy`).
 * Aligné sur le backend Express partagé — ne pas préfixer `/api` ici.
 */
export const API_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',

  VIDEOS: '/videos',
  VIDEO_LIKE: (id: string) => `/videos/${id}/like`,
  VIDEO_COMMENT: (id: string) => `/videos/${id}/comment`,
  VIDEO_COMMENTS: (id: string) => `/videos/${id}/comments`,

  LIVES: '/live',
  LIVE_END: (id: string) => `/live/${id}/end`,

  PRODUCTS: '/products',
  ORDERS: '/orders',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ANALYTICS_OVERVIEW: '/admin/analytics/overview',
  ADMIN_ANALYTICS_REALTIME: '/admin/analytics/realtime',
  ADMIN_ANALYTICS_USERS: (period = '7d') => `/admin/analytics/users?period=${encodeURIComponent(period)}`,
  ADMIN_ANALYTICS_REVENUE: (period = '30d') => `/admin/analytics/revenue?period=${encodeURIComponent(period)}`,
  ADMIN_ANALYTICS_CONTENT: (period = '7d') => `/admin/analytics/content?period=${encodeURIComponent(period)}`,
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_USERS: '/admin/users',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  ADMIN_WITHDRAWALS: '/admin/withdrawals',
  ADMIN_LIVES_ACTIVE: '/admin/lives/active',
  ADMIN_LIVES_HISTORY: '/admin/lives/history',
  ADMIN_LIVE_TERMINATE: (id: string) => `/admin/lives/${id}/terminate`,
  ADMIN_VERIFICATIONS: '/admin/verifications',
  ADMIN_MONETIZATION_REQUESTS: '/admin/monetization-requests',
  MODERATION_REPORTS: '/moderation/reports',
  ADMIN_BROADCAST: '/admin/broadcast-notification',

  MOBILE_PUSH_TOKEN: '/mobile/push-token',
  MOBILE_SYNC: '/mobile/sync',
  MOBILE_DOWNLOAD_URL: (id: string) => `/mobile/videos/${id}/download-url`,
  MOBILE_RESOLVE_DEEPLINK: '/mobile/resolve-deeplink',
  MOBILE_DEVICE_SETTINGS: '/mobile/device-settings',
  MOBILE_ANALYTICS_EVENT: '/mobile/analytics/event',
} as const;
