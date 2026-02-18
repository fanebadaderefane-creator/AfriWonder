/**
 * Registre central des données persistées AfriWonder.
 * Production-ready : une seule source de vérité pour ce qui survit au redémarrage.
 *
 * Règle : toute donnée critique doit être sauvegardée via safeStorage, IndexedDB ou le cache React Query.
 * Ne jamais laisser d'état temporaire non sauvegardé pour les données qui doivent survivre à un refresh.
 */

/** Clés localStorage (via safeStorage) */
export const STORAGE_KEYS = {
  // Auth & session
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  AUTH_USER: 'afriwonder_auth_user',

  // Préférences
  PREFERENCES: 'afw_preferences',

  // Cache React Query (feed, vidéos, user, etc.)
  REACT_QUERY_CACHE: 'afw_react_query_cache',

  // Métier
  HIDDEN_ADS: 'afw_hidden_ads',
  DEVICE_ID: 'afw_device_id',
  RECENT_SEARCHES: 'recent_searches',
  COOKIE_CONSENT: 'cookie_consent',
  REFERRAL_CODE: 'afriwonder_referral_code',
};

/** Base IndexedDB (afriwonder-offline) — téléchargements offline */
export const IDB_STORES = {
  DOWNLOADS: 'downloads',
};
