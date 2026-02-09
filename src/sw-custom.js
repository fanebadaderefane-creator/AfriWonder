/* eslint-disable no-restricted-globals */
// Ce fichier est utilisé par vite-plugin-pwa en mode injectManifest.
// Les noms de precache sont injectés à la place de self.__WB_MANIFEST.

const MEDIA_CACHE = 'afriwonder-media-v1';
const API_CACHE = 'afriwonder-api-v1';
const PRECACHE = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('afriwonder-precache-v1').then((cache) => {
      const urls = Array.isArray(PRECACHE)
        ? PRECACHE.map((e) => (typeof e === 'string' ? e : e.url))
        : [];
      return cache.addAll(urls.filter(Boolean)).then(() => self.skipWaiting());
    }).catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      const toDelete = names.filter(
        (n) => n !== MEDIA_CACHE && n !== API_CACHE && n !== 'afriwonder-precache-v1'
      );
      return Promise.all(toDelete.map((n) => caches.delete(n)));
    }).then(() => self.clients.claim())
  );
});

// 1) Média téléchargé : CacheFirst (lecture offline)
// 2) API : NetworkFirst (fallback cache)
// 3) Reste : Network first, puis precache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  event.respondWith((async () => {
    // 1) Média : d’abord le cache (vidéos téléchargées)
    const mediaMatch = await caches.match(request, { cacheName: MEDIA_CACHE });
    if (mediaMatch) return mediaMatch;

    // 2) API : NetworkFirst
    if (url.pathname.startsWith('/api/')) {
      try {
        const net = await fetch(request);
        if (net.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(request, net.clone());
        }
        return net;
      } catch {
        const cached = await caches.match(request, { cacheName: API_CACHE });
        return cached || new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3) Assets / pages : Network first, fallback precache
    try {
      return await fetch(request);
    } catch {
      const precache = await caches.match(request);
      return precache || caches.match('/index.html');
    }
  })());
});
