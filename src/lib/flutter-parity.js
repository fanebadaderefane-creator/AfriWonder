/**
 * Registre unique (pas de doc Markdown) : modules et comportements à reproduire côté Flutter.
 * Aligner avec `persistence-registry.js` (STORAGE_KEYS, queryKey*) et `EAGER_SHELL_PAGE_KEYS`.
 */

/** @typedef {{ id: string, module: string, flutterHint: string }} FlutterParityMarker */

/** @type {FlutterParityMarker[]} */
export const FLUTTER_PARITY_MARKERS = [
  { id: 'auth-storage', module: 'src/lib/secureTokenStorage.js', flutterHint: 'Secure storage (tokens) + refresh flow' },
  { id: 'query-cache', module: 'src/lib/query-client.js', flutterHint: 'TanStack → Riverpod/Bloc + Hive/Isar, networkMode offlineFirst' },
  { id: 'persist-keys', module: 'src/lib/persistence-registry.js', flutterHint: 'STORAGE_KEYS, APP_EVENTS, queryKeyFeed/Videos' },
  { id: 'sw-routing', module: 'src/sw-custom.js', flutterHint: 'Navigation fallback shell; API NetworkFirst/SWR; vidéo CacheFirst + IDB MP4' },
  { id: 'offline-video', module: 'src/lib/offlineVideoCache.js', flutterHint: 'IDB blobs + LRU; même schéma que offlineVideoIdbCore' },
  { id: 'prefetch', module: 'src/lib/feedVideoPrefetch.js', flutterHint: 'File MP4 progressive; bas débit = délai entre GET; pas HLS segmenté ici' },
  { id: 'feed-sw-scope', module: 'src/lib/feedRequestScope.js', flutterHint: 'afwScope = guest | hash opaque (SHA-256) — mêmes routes ; pas d’UUID en clair dans l’URL' },
  { id: 'media-fetch-timeout', module: 'src/lib/mediaFetchTimeout.js', flutterHint: 'Timeout unique téléchargements MP4 (prefetch + save offline)' },
  { id: 'network-hints', module: 'src/lib/networkHints.js', flutterHint: 'effectiveType + saveData → qualité basse + retries' },
  { id: 'express-client', module: 'src/api/expressClient.js', flutterHint: 'Timeouts, retries 502/503/504 GET, base URL' },
  { id: 'api-base-config', module: 'src/lib/apiBaseUrl.js', flutterHint: 'Lecture config.json + normalisation …/api' },
  { id: 'auth-context', module: 'src/lib/AuthContext.jsx', flutterHint: 'Session, hydrate user, aligner avec secure storage' },
  { id: 'app-layout', module: 'src/Layout.jsx', flutterHint: 'Shell navigation (bottom nav), même arborescence que go_router racine' },
  { id: 'feed-ui-mount', module: 'src/features/feed/components/FeedVideoSlide.jsx', flutterHint: 'Mount radius voisins seulement; offlineBlobUrl' },
  { id: 'playback', module: 'src/components/video/VideoCard.jsx', flutterHint: 'HLS adaptatif (hls.js) / MP4; NE PAS diverger sans spec produit' },
  { id: 'pages-shell', module: 'src/pages.config.glob.js', flutterHint: 'Écrans eager = racine go_router' },
];

export function getFlutterParityMarker(id) {
  return FLUTTER_PARITY_MARKERS.find((m) => m.id === id) || null;
}
