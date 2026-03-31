 
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
/** Injecté au build (vite `define __AFRW_SW_VERSION__`) */
const SW_VERSION =
  typeof __AFRW_SW_VERSION__ !== 'undefined' ? __AFRW_SW_VERSION__ : 'afw-local';
const FEED_ASSET_PREFETCH_BATCH_LIMIT = 12;
const FEED_MANIFEST_SEGMENT_PREFETCH_LIMIT = 24;
const VIDEO_CACHE_MAX_ENTRIES = 60;
const IMAGE_CACHE_MAX_ENTRIES = 120;
const inflightWarmups = new Set();

// Share Target: rediriger les partages système vers une route interne lisible par React
const SHARE_TARGET_PATH = '/share-target';

// ---------------------------------------------------------------------------
// Workbox : precache + stratégies API / Background Sync
// ---------------------------------------------------------------------------

// Precache des assets principaux générés par VitePWA
precacheAndRoute(PRECACHE);

function shouldCacheResponse(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

async function trimCacheEntries(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const staleKeys = keys.slice(0, keys.length - maxEntries);
    await Promise.all(staleKeys.map((key) => cache.delete(key)));
  } catch {
    // Best effort
  }
}

/** Sous pression disque (quota), évincer une partie du cache vidéo (audit ~80 % quota). */
async function maybeRelieveStoragePressure() {
  try {
    if (!navigator.storage?.estimate) return;
    const { usage, quota } = await navigator.storage.estimate();
    if (!quota || usage < quota * 0.8) return;
    const cache = await caches.open(VIDEO_CACHE);
    const keys = await cache.keys();
    if (!keys.length) return;
    const drop = Math.max(1, Math.ceil(keys.length * 0.35));
    await Promise.all(keys.slice(0, drop).map((key) => cache.delete(key)));
  } catch {
    // ignore
  }
}

async function cacheFirstMediaRequest(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (shouldCacheResponse(networkResponse)) {
    cache.put(request, networkResponse.clone()).catch(() => {});
    const maxEntries = cacheName === VIDEO_CACHE ? VIDEO_CACHE_MAX_ENTRIES : IMAGE_CACHE_MAX_ENTRIES;
    trimCacheEntries(cacheName, maxEntries).catch(() => {});
    if (cacheName === VIDEO_CACHE) {
      maybeRelieveStoragePressure().catch(() => {});
    }
  }
  return networkResponse;
}

async function warmCacheUrl(rawUrl, cacheName) {
  if (!rawUrl) return null;

  let normalizedUrl;
  try {
    normalizedUrl = new URL(rawUrl, self.location.origin).toString();
  } catch {
    return null;
  }

  if (inflightWarmups.has(normalizedUrl)) return null;
  inflightWarmups.add(normalizedUrl);

  try {
    const url = new URL(normalizedUrl);
    const request = new Request(url.toString(), {
      mode: url.origin === self.location.origin ? 'cors' : 'no-cors',
      credentials: 'omit',
    });
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      await cache.put(request, response.clone());
      const maxEntries = cacheName === VIDEO_CACHE ? VIDEO_CACHE_MAX_ENTRIES : IMAGE_CACHE_MAX_ENTRIES;
      trimCacheEntries(cacheName, maxEntries).catch(() => {});
      if (cacheName === VIDEO_CACHE) {
        maybeRelieveStoragePressure().catch(() => {});
      }
    }
    return response;
  } catch {
    return null;
  } finally {
    inflightWarmups.delete(normalizedUrl);
  }
}

async function warmManifestAndSegments(manifestUrl, depth = 0, segmentLimit = FEED_MANIFEST_SEGMENT_PREFETCH_LIMIT) {
  if (!manifestUrl || depth > 1) return;

  const manifestResponse = await warmCacheUrl(manifestUrl, VIDEO_CACHE);
  if (!manifestResponse || manifestResponse.type === 'opaque') return;

  try {
    const manifestText = await manifestResponse.clone().text();
    const manifestBase = new URL(manifestUrl, self.location.origin);
    const segmentUrls = manifestText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .slice(0, Math.max(1, segmentLimit));

    await Promise.all(
      segmentUrls.map((entry) => {
        const resolved = new URL(entry, manifestBase).toString();
        if (/\.m3u8(\?|$)/i.test(resolved)) {
          return warmManifestAndSegments(resolved, depth + 1, segmentLimit);
        }
        return warmCacheUrl(resolved, VIDEO_CACHE);
      })
    );
  } catch {
    // Manifeste non lisible ou format inattendu: rester best-effort.
  }
}

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
      .then(() => Promise.all([
        trimCacheEntries(VIDEO_CACHE, VIDEO_CACHE_MAX_ENTRIES),
        trimCacheEntries(IMAGE_CACHE, IMAGE_CACHE_MAX_ENTRIES),
      ]))
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
  if (event.data?.type === 'PREFETCH_FEED_ASSETS') {
    const assets = Array.isArray(event.data.assets) ? event.data.assets : [];
    event.waitUntil(
      Promise.all(
        assets.slice(0, FEED_ASSET_PREFETCH_BATCH_LIMIT).map(async (asset) => {
          const posterUrl = asset?.posterUrl;
          const videoUrl = asset?.videoUrl;
          const manifestUrl = asset?.manifestUrl;
          let warmed = false;

          if (posterUrl) {
            const posterResponse = await warmCacheUrl(posterUrl, IMAGE_CACHE);
            warmed = warmed || !!posterResponse;
          }
          if (manifestUrl) {
            const segmentPrefetchLimit = Number(asset?.segmentPrefetchLimit) || FEED_MANIFEST_SEGMENT_PREFETCH_LIMIT;
            await warmManifestAndSegments(manifestUrl, 0, segmentPrefetchLimit);
            warmed = true;
          } else if (videoUrl) {
            const videoResponse = await warmCacheUrl(videoUrl, VIDEO_CACHE);
            warmed = warmed || !!videoResponse;
          }

          return warmed
            ? {
                id: asset?.id,
                title: asset?.title || '',
                creatorName: asset?.creatorName || '',
                creatorAvatar: asset?.creatorAvatar || '',
                posterUrl: asset?.posterUrl || '',
                video: asset?.video || null,
                cachedAt: Date.now(),
              }
            : null;
        })
      )
        .then((preparedAssets) => {
          const readyAssets = preparedAssets.filter(Boolean);
          if (readyAssets.length === 0) return;
          return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'FEED_PREFETCH_DONE', assets: readyAssets });
            });
          });
        })
        .catch(() => {})
    );
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
  const tag = payload.tag || payload.category || 'message';
  const options = {
    body: payload.body || payload.message || 'Nouvelle activité',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag,
    data: { ...(payload.data || {}), category: tag },
    renotify: true,
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function') {
          const notes = await self.registration.getNotifications();
          await navigator.setAppBadge(notes.length);
        }
      } catch {
        // API Badge optionnelle
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const chatParams = new URLSearchParams();
  if (data?.conversationId) chatParams.set('conversationId', String(data.conversationId));
  if (data?.senderId) chatParams.set('_userId', String(data.senderId));
  const targetPath = data?.conversationId
    ? `/Chat?${chatParams.toString()}`
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

  // Ne pas intercepter les callbacks OAuth (risque de réponse périmée du cache SW)
  if (url.pathname.startsWith('/~oauth')) {
    return;
  }

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
      cacheFirstMediaRequest(request, VIDEO_CACHE)
    );
    return;
  }

  // MP4 offline-friendly (uniquement même origine, sans Range).
  // Les requêtes avec Range sont exclues pour éviter des comportements streaming cassés.
  if (!isProxyMedia && !hasRange && isMp4) {
    event.respondWith(
      cacheFirstMediaRequest(request, VIDEO_CACHE)
    );
    return;
  }

  // Laisser passer les streams avec Range (streaming classique). Les médias déjà
  // préchauffés sont servis par les branches cache-first ci-dessus.
  const cdnHosts = ['cdn.afriwonder.com'];
  const isCdnMedia =
    cdnHosts.includes(url.hostname) ||
    url.hostname.endsWith('.r2.dev') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('b-cdn.net');
  const isVideoRequest = request.destination === 'video';
  if ((isCdnMedia || isVideoRequest) && hasRange) return;

  event.respondWith(
    (async () => {
      // Images (incl. cross-origin/no-cors): CacheFirst + revalidation en arriere-plan.
      // Les reponses "opaque" sont normales pour les images externes et ne doivent pas etre rejetees.
      if (request.destination === 'image') {
        const imageCache = await caches.open(IMAGE_CACHE);
        const cachedImage = await imageCache.match(request);
        if (cachedImage) {
          return cachedImage;
        }

        const networkImage = await fetch(request)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              imageCache.put(request, res.clone());
              trimCacheEntries(IMAGE_CACHE, IMAGE_CACHE_MAX_ENTRIES).catch(() => {});
            }
            return res;
          })
          .catch(() => null);
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
            <html lang="fr">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>AfriWonder — Hors ligne</title>
                <style>
                  body {
                    margin: 0;
                    padding: 24px;
                    font-family: system-ui, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: #020617;
                    color: #f8fafc;
                    gap: 16px;
                    text-align: center;
                  }
                  a, button {
                    color: #38bdf8;
                    font-weight: 600;
                  }
                  button {
                    margin-top: 8px;
                    padding: 12px 20px;
                    background: #f97316;
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1rem;
                  }
                </style>
              </head>
              <body>
                <p>Impossible de charger cette page sans réseau.</p>
                <button type="button" onclick="window.location.reload()">Réessayer</button>
                <p><a href="/">Retour à l&apos;accueil</a></p>
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

