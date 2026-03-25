 
// Ce fichier est utilise par vite-plugin-pwa en mode injectManifest.
// Les noms de precache sont injectes a la place de self.__WB_MANIFEST.
// Workbox est utilise pour le precache, les stratégies API et le Background Sync.

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

const MEDIA_CACHE = 'afriwonder-media-v1';
const API_CACHE = 'afriwonder-api-v1';
const VIDEO_CACHE = 'afriwonder-video-cache-v1';
const IMAGE_CACHE = 'afriwonder-image-cache-v1';
const PRECACHE = self.__WB_MANIFEST || [];
const SW_VERSION = 'v5'; // Invalide l'ancien SW pour diffuser les correctifs offline (HLS/cache)

// Share Target: rediriger les partages système vers une route interne lisible par React
const SHARE_TARGET_PATH = '/share-target';

// ---------------------------------------------------------------------------
// Workbox : precache + stratégies API / Background Sync
// ---------------------------------------------------------------------------

// Precache des assets principaux générés par VitePWA
precacheAndRoute(PRECACHE);

// Background Sync pour les messages envoyés hors-ligne
const messagesBgSyncPlugin = new BackgroundSyncPlugin('afriwonder-offline-messages-queue', {
  // Durée maximale de rétention dans la file (en minutes)
  maxRetentionTime: 24 * 60,
});

// API messages — POST avec Background Sync (offline-first Mali)
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/messages') && request.method === 'POST',
  new NetworkFirst({
    cacheName: API_CACHE,
    plugins: [messagesBgSyncPlugin],
  }),
  'POST'
);

// API GET — NetworkFirst (fallback cache)
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: API_CACHE,
  })
);

// ---------------------------------------------------------------------------
// Cycle de vie du Service Worker
// ---------------------------------------------------------------------------

// Ne pas appeler skipWaiting() ici : on laisse le nouveau worker en "waiting"
// pour que l'app affiche "Mettre a jour" (PWAUpdateToast). skipWaiting est
// appele uniquement quand l'utilisateur clique sur "Mettre a jour" (message SKIP_WAITING).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(`afriwonder-precache-${SW_VERSION}`)
      .then((cache) => {
        const urls = Array.isArray(PRECACHE)
          ? PRECACHE.map((e) => (typeof e === 'string' ? e : e.url))
          : [];
        return cache.addAll(urls.filter(Boolean));
      })
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => {
        const toDelete = names.filter(
          (n) =>
            n !== MEDIA_CACHE &&
            n !== API_CACHE &&
            n !== VIDEO_CACHE &&
            n !== IMAGE_CACHE &&
            n !== `afriwonder-precache-${SW_VERSION}`
        );
        return Promise.all(toDelete.map((n) => caches.delete(n)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Notifier tous les clients que le nouveau worker est activé
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
    });
  }
});

// Push hors-app (messages, commentaires, appels, etc.)
self.addEventListener('push', (event) => {
  const raw = event.data ? event.data.text() : '{}';
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { body: raw };
  }
  const title = payload.title || 'AfriWonder';
  const options = {
    body: payload.body || payload.message || 'Nouvelle activité',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || payload.category || 'afriwonder',
    data: payload.data || {},
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const targetPath = data?.conversationId
    ? `/Chat?conversationId=${encodeURIComponent(data.conversationId)}`
    : data?.videoId
      ? `/Video?id=${encodeURIComponent(data.videoId)}`
      : '/Notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'PUSH_OPEN', path: targetPath, data });
        return null;
      }
      return self.clients.openWindow(targetPath);
    })
  );
});

// Gérer les erreurs du service worker
self.addEventListener('error', (event) => {
   
  console.error('Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
   
  console.error('Service Worker Unhandled Rejection:', event.reason);
  event.preventDefault();
});

// ---------------------------------------------------------------------------
// Fetch handler complémentaire (vidéos, images, HTML fallback)
// Workbox gère déjà :
// - /api/** GET via NetworkFirst
// - /api/messages POST via NetworkFirst + Background Sync
// ---------------------------------------------------------------------------

// 1) Media telecharge : CacheFirst (lecture offline)
// 2) API : NetworkFirst (fallback cache) — géré par Workbox
// 3) Reste : Network first, puis precache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Web Share Target: interception du POST /share-target
  if (request.method === 'POST' && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(
      (async () => {
        try {
          const formData = await request.formData();
          const sharedUrl = formData.get('url') || formData.get('link') || '';
          const sharedText = formData.get('text') || '';
          const sharedTitle = formData.get('title') || '';

          const params = new URLSearchParams();
          if (sharedUrl) params.set('url', sharedUrl);
          if (sharedText) params.set('text', sharedText);
          if (sharedTitle) params.set('title', sharedTitle);

          const redirectUrl = `/ShareOffline?${params.toString()}`;
          return Response.redirect(redirectUrl, 303);
        } catch {
          return Response.redirect('/ShareOffline', 303);
        }
      })()
    );
    return;
  }

  // Laisser Workbox gérer les autres méthodes (POST /api/messages, etc.)
  if (request.method !== 'GET') return;

  // Videos same-origin + HLS (.m3u8, .ts) : CacheFirst pour relecture offline
  // Ne jamais intercepter /api/proxy/media : Chrome/mobile envoient des Range, ont besoin de 206 (streaming).
  // Ne pas cacher les requêtes avec Range (metadata/thumbnails) pour éviter miniatures cassées sur PWA.
  const isSameOrigin = url.origin === self.location.origin;
  const isProxyMedia = url.pathname.includes('proxy/media');
  const isHlsManifest = /\.m3u8(\?|$)/i.test(url.pathname + url.search);
  const isHlsSegment = /\.ts(\?|$)/i.test(url.pathname + url.search);
  const isHlsAsset = isHlsManifest || isHlsSegment;
  const isMp4 = /\.mp4(\?|$)/i.test(url.pathname + url.search);
  const hasRange = request.headers.has('Range');

  // HLS offline-ready: met en cache les manifestes (.m3u8) et segments (.ts),
  // y compris quand ils viennent du CDN (pas de Range en général).
  if (!isProxyMedia && !hasRange && isHlsAsset) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached ||
          fetch(request).then((netRes) => {
            if (netRes && netRes.ok) cache.put(request, netRes.clone());
            return netRes;
          })
        )
      )
    );
    return;
  }

  // MP4 offline-friendly (uniquement même origine, sans Range).
  // Les requêtes avec Range sont exclues pour éviter des comportements streaming cassés.
  if (isSameOrigin && !isProxyMedia && !hasRange && isMp4) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached ||
          fetch(request).then((netRes) => {
            if (netRes.ok) cache.put(request, netRes.clone());
            return netRes;
          })
        )
      )
    );
    return;
  }

  // Ne pas intercepter les videos CDN (streaming, Range requests)
  const cdnHosts = ['cdn.afriwonder.com', 'cdn.afriwonder.com'];
  const isCdnMedia = cdnHosts.includes(url.hostname) || url.hostname.endsWith('.r2.dev');
  const isVideoRequest = request.destination === 'video';
  if (isCdnMedia || isVideoRequest) return;

  event.respondWith(
    (async () => {
      // Images (incl. cross-origin/no-cors): CacheFirst + revalidation en arriere-plan.
      // Les reponses "opaque" sont normales pour les images externes et ne doivent pas etre rejetees.
      if (request.destination === 'image') {
        const imageCache = await caches.open(IMAGE_CACHE);
        const cachedImage = await imageCache.match(request);
        const networkImagePromise = fetch(request)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              imageCache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => null);

        if (cachedImage) {
          // Stale-while-revalidate: renvoie immediatement puis met a jour le cache
          networkImagePromise.catch(() => {});
          return cachedImage;
        }

        const networkImage = await networkImagePromise;
        if (networkImage) return networkImage;

        // Fallback neutre local si aucune image n'est disponible
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#bbf7d0"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      }

      // 1) Media : d'abord le cache (videos telechargees)
      const mediaMatch = await caches.match(request, { cacheName: MEDIA_CACHE });
      if (mediaMatch) return mediaMatch;

      // 2) Assets / pages : Network first, fallback precache
      try {
        const networkResponse = await fetch(request);
        // Accepter aussi les reponses opaque (cross-origin/no-cors)
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
          return networkResponse;
        }
        throw new Error('Network response not ok');
      } catch (error) {
        // Essayer le cache precache
        const precache = await caches.match(request);
        if (precache) return precache;

        // Si c'est une requete HTML, retourner index.html depuis le cache
        if (request.headers.get('accept')?.includes('text/html')) {
          const indexHtml = await caches.match('/index.html');
          if (indexHtml) return indexHtml;
        }

        // Dernier recours : reponse basique pour eviter l'ecran blanc
        if (request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            `<!DOCTYPE html>
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
                    border-top-color: #2563eb;
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
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        }

        throw error;
      }
    })()
  );
});

