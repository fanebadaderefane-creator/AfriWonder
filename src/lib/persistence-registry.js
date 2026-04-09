/**
 * Registre central des données persistées AfriWonder.
 * Production-ready : une seule source de vérité pour ce qui survit au redémarrage.
 *
 * Règle : toute donnée critique doit être sauvegardée via safeStorage, IndexedDB ou le cache React Query.
 * Ne jamais laisser d'état temporaire non sauvegardé pour les données qui doivent survivre à un refresh.
 *
 * Flutter : répliquer STORAGE_KEYS + APP_EVENTS + mêmes factory queryKey* pour cache offline équivalent.
 * Écrans shell pré-bundlés (PWA) : voir `EAGER_SHELL_PAGE_KEYS` dans `pages.config.glob.js`.
 * Liste détaillée modules → `flutter-parity.js` (FLUTTER_PARITY_MARKERS).
 */

export {
  OFFLINE_VIDEO_DB_NAME,
  OFFLINE_VIDEO_DB_VERSION,
  OFFLINE_VIDEO_STORE,
  OFFLINE_VIDEO_CACHE_MAX_ENTRIES,
  OFFLINE_VIDEO_CACHE_MAX_BYTES,
} from './offlineVideoIdbCore.js';

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

/**
 * Événements `window` — garder les mêmes chaînes si un bridge Flutter/WebView reprend les hooks offline.
 */
export const APP_EVENTS = {
  OFFLINE_VIDEO_CACHED: 'afw-offline-video-cached',
};

/**
 * Clés TanStack Query — fabriques pour éviter les typos ; mirror côté Flutter (ex. @HiveType + même construction de clé).
 */
/** TanStack `userId` = même partition que le scope interne ; URL utilise `getAfwScopeParamForRequest()` (hash). */
export function queryKeyFeed(userId) {
  return ['feed', userId ?? 'guest'];
}

export function queryKeyVideos(userId) {
  return ['videos', userId ?? 'guest'];
}

/** Invalider tous les feeds (TanStack : préfixe commun). */
export const QUERY_INVALIDATE_FEED_PREFIX = ['feed'];
export const QUERY_INVALIDATE_VIDEOS_PREFIX = ['videos'];
/** Grilles profil (Discover/Profile) — même préfixe côté Flutter si cache par créateur. */
export const QUERY_INVALIDATE_PROFILE_VIDEOS_PREFIX = ['profile-videos'];

/** États like/save pour la fenêtre visible du feed — mirror Flutter (même clé de cache). */
export function queryKeyFeedVideoStates(userId, visibleIdsJoined) {
  return ['feed-video-states', userId ?? 'guest', visibleIdsJoined];
}

export { FLUTTER_PARITY_MARKERS, getFlutterParityMarker } from './flutter-parity.js';
