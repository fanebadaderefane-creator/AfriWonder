/* eslint-disable no-restricted-globals */
// Ce fichier est utilisé par vite-plugin-pwa en mode injectManifest.
// Les noms de precache sont injectés à la place de self.__WB_MANIFEST.

const MEDIA_CACHE = 'afriwonder-media-v1';
const API_CACHE = 'afriwonder-api-v1';
const VIDEO_CACHE = 'afriwonder-video-cache-v1';
const PRECACHE = self.__WB_MANIFEST || [];
const SW_VERSION = 'v2'; // Bypass CDN pour éviter erreur SW sur vidéos

// Ne pas appeler skipWaiting() ici : on laisse le nouveau worker en "waiting"
// pour que l'app affiche "Mettre à jour" (PWAUpdateToast). skipWaiting() est
// appelé uniquement quand l'utilisateur clique sur "Mettre à jour" (message SKIP_WAITING).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`afriwonder-precache-${SW_VERSION}`).then((cache) => {
      const urls = Array.isArray(PRECACHE)
        ? PRECACHE.map((e) => (typeof e === 'string' ? e : e.url))
        : [];
      return cache.addAll(urls.filter(Boolean));
    }).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      const toDelete = names.filter(
        (n) => n !== MEDIA_CACHE && n !== API_CACHE && n !== VIDEO_CACHE && n !== `afriwonder-precache-${SW_VERSION}`
      );
      return Promise.all(toDelete.map((n) => caches.delete(n)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Notifier tous les clients que le nouveau worker est activé
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
    });
  }
});

// Gérer les erreurs du service worker
self.addEventListener('error', (event) => {
  console.error('Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker Unhandled Rejection:', event.reason);
  event.preventDefault();
});

// 1) Média téléchargé : CacheFirst (lecture offline)
// 2) API : NetworkFirst (fallback cache)
// 3) Reste : Network first, puis precache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Vidéos same-origin + HLS (.m3u8, .ts) : CacheFirst pour relecture offline
  // Ne jamais intercepter /api/proxy/media : Chrome/mobile envoient des Range, ont besoin de 206 (streaming)
  const isSameOrigin = url.origin === self.location.origin;
  const isProxyMedia = url.pathname.includes('proxy/media');
  const isHlsSegment = /\.ts(\?|$)/i.test(url.pathname + url.search);
  const isVideoUrl = request.destination === 'video' || url.pathname.includes('proxy/media') || /\.mp4(\?|$)/i.test(url.pathname + url.search) || /\.m3u8(\?|$)/i.test(url.pathname + url.search);
  const hasRange = request.headers.has('Range');
  if (isSameOrigin && !isProxyMedia && !hasRange && (isVideoUrl || isHlsSegment)) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached || fetch(request).then((netRes) => {
            if (netRes.ok) cache.put(request, netRes.clone());
            return netRes;
          })
        )
      )
    );
    return;
  }

  // Ne pas intercepter les vidéos CDN (streaming, Range requests)
  const cdnHosts = ['cdn.afriwonder.com', 'cdn.africonnect.com'];
  const isCdnMedia = cdnHosts.includes(url.hostname) || url.hostname.endsWith('.r2.dev');
  const isVideoRequest = request.destination === 'video';
  if (isCdnMedia || isVideoRequest) return;

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
      const networkResponse = await fetch(request);
      // Vérifier que la réponse est valide
      if (networkResponse && networkResponse.ok) {
        return networkResponse;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      // Essayer le cache precache
      const precache = await caches.match(request);
      if (precache) return precache;
      
      // Si c'est une requête HTML, retourner index.html depuis le cache
      if (request.headers.get('accept')?.includes('text/html')) {
        const indexHtml = await caches.match('/index.html');
        if (indexHtml) return indexHtml;
      }
      
      // Dernier recours : retourner une réponse basique pour éviter l'écran blanc
      if (request.headers.get('accept')?.includes('text/html')) {
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>AfriWonder - Chargement...</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: system-ui; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  background: #000; 
                  color: #fff; 
                }
                .spinner {
                  width: 40px;
                  height: 40px;
                  border: 4px solid rgba(255,255,255,0.1);
                  border-top-color: #f97316;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <p style="margin-top: 20px;">Chargement de l'application...</p>
              <script>setTimeout(() => window.location.reload(), 2000);</script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      throw error;
    }
  })());
});
