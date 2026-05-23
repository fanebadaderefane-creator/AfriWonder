// src/sw-custom.js — Workbox professionnel AfriWonder
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly
} from 'workbox-strategies';
import { getOfflineVideoResponseForRequest } from '@/lib/offlineVideoIdbCore.js';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const SW_VERSION = typeof __AFRW_SW_VERSION__ !== 'undefined'
  ? __AFRW_SW_VERSION__ : 'afw-local';

// ─── Noms de cache ───────────────────────────────────────────────────────────
const CACHE = {
  APP_SHELL:  `afw-shell-${SW_VERSION}`,
  API:        'afw-api-v2',
  FEED:       'afw-feed-v2',
  IMAGES:     'afw-images-v2',
  VIDEO:      'afw-video-v2',
  FONTS:      'afw-fonts-v1',
  STATIC:     'afw-static-v1',
};

// ─── Precache + nettoyage ────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ─── Navigation (SPA) ────────────────────────────────────────────────────────
// index.html depuis le precache : ouverture instantanée + navigation hors-ligne après 1ère visite
// (réseaux faibles type 3G au Mali : ne pas attendre un HTML réseau qui time-out).
let navigationHandler = null;
try {
  navigationHandler = createHandlerBoundToURL('/index.html');
} catch {
  navigationHandler = null;
}

if (navigationHandler) {
  registerRoute(
    new NavigationRoute(navigationHandler, {
      denylist: [/^\/api\/?/, /^\/socket\.io/],
    })
  );
} else {
  const networkFirstStrategy = new NetworkFirst({
    cacheName: CACHE.APP_SHELL,
    networkTimeoutSeconds: 2,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  });
  registerRoute(
    new NavigationRoute(async ({ event }) => {
      try {
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) return preloadResponse;
      } catch {}
      return networkFirstStrategy.handle({ event });
    })
  );
}

// ─── Fonts ───────────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com'
    || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: CACHE.FONTS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60, maxEntries: 20 }),
    ],
  })
);

// ─── Images statiques ────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE.IMAGES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Assets JS/CSS ────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: CACHE.STATIC,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  })
);

// ─── Manifest PWA : repli hors-ligne pour installation / relance shell ───────
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && /\/manifest\.json$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: CACHE.STATIC,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ─── /config.json (prod sans VITE_API_URL) — dernier JSON valide si réseau capricieux (Mali) ───
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && /\/config\.json$/i.test(url.pathname),
  new NetworkFirst({
    cacheName: CACHE.API,
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ─── API Feed (StaleWhileRevalidate — rapide même hors ligne) ─────────────────
// Le client envoie afwScope sur GET personnalisés (/api/feed, /api/me/*, /api/cart, etc.) — pas de fuite entre comptes.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/feed') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: CACHE.FEED,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      // Hors ligne prolongée (Mali) : garder un dernier feed exploitable un peu plus longtemps
      new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 25 * 60 }),
    ],
  })
);

// ─── API REST générale (NetworkFirst — repli cache rapide si réseau saturé) ────
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && request.method === 'GET'
    && !url.pathname.startsWith('/api/feed'),
  new NetworkFirst({
    cacheName: CACHE.API,
    // Latence satellite / 3G : éviter de basculer trop tôt sur le cache alors que le réseau répond encore
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      // afwScope + nombre de routes perso → plus d’entrées distinctes par compte
      new ExpirationPlugin({ maxEntries: 160, maxAgeSeconds: 15 * 60 }),
    ],
  })
);

// ─── Background Sync — mutations offline ────────────────────────────────────
const bgSyncPlugin = new BackgroundSyncPlugin('afw-mutations-queue', {
  maxRetentionTime: 24 * 60, // 24h
});

// Mutations (POST)
registerRoute(
  ({ url, request }) =>
    (url.pathname.startsWith('/api/messages') || 
     (url.pathname.startsWith('/api/videos') && url.pathname.endsWith('/like')) ||
     url.pathname.startsWith('/api/comments')) && 
    request.method === 'POST',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);

// ─── Vidéos HLS / MP4 — hors ligne : IndexedDB (blobs MP4 préchargés) ; en ligne : Cache Storage
const videoCacheFirst = new CacheFirst({
  cacheName: CACHE.VIDEO,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200, 206] }),
    // Plusieurs lectures hors ligne / réseau instable : un peu plus d’entrées + fenêtre un peu plus longue
    new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 8 * 60 * 60 }),
  ],
});

function isVideoAssetRequest(url, request) {
  if (request.method !== 'GET') return false;
  return (
    /\.(m3u8|ts|mp4|webm|m4s)(\?|$)/i.test(url.pathname) ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('r2.dev')
  );
}

// Vidéo : cache réseau d’abord, puis repli IndexedDB (MP4 préchargés) si échec / statut invalide.
// Réseaux instables : onLine peut rester true alors que fetch timeout — même logique que Flutter (fallback local avant échec final).
registerRoute(
  ({ url, request }) => isVideoAssetRequest(url, request),
  async ({ request, event }) => {
    const tryIdb = async () => {
      try {
        return await getOfflineVideoResponseForRequest(request);
      } catch {
        return null;
      }
    };

    if (self.navigator && self.navigator.onLine === false) {
      const offlineFirst = await tryIdb();
      if (offlineFirst) return offlineFirst;
    }

    try {
      const res = await videoCacheFirst.handle({ event, request });
      // opaque (no-cors) : ok est false alors que le navigateur peut lire la ressource en cache.
      const usable =
        res &&
        (res.ok ||
          res.status === 206 ||
          (res.type === 'opaque' && res.status === 0));
      if (usable) return res;
    } catch {
      /* cache miss + réseau KO */
    }

    const blobFallback = await tryIdb();
    if (blobFallback) return blobFallback;

    try {
      return await videoCacheFirst.handle({ event, request });
    } catch {
      return new Response('', { status: 503, statusText: 'Video unavailable' });
    }
  }
);

// ─── Cycle de vie ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Ne PAS appeler skipWaiting ici → l'utilisateur confirme via PWAUpdateToast
  event.waitUntil(
    caches.open(CACHE.APP_SHELL).then(cache =>
      cache.addAll(['/', '/offline.html', '/icon-192.png', '/icon-512.png'])
    ).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Active Navigation Preload si supporté (Fix 10)
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => !Object.values(CACHE).includes(n))
          .map(n => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Messages depuis l'app ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }))
    );
  }

  if (event.data?.type === 'PREFETCH_FEED_ASSETS') {
    const assets = event.data.assets || [];
    event.waitUntil(prefetchFeedAssets(assets));
  }
});

async function prefetchFeedAssets(assets) {
  const cache = await caches.open(CACHE.VIDEO);
  const imgCache = await caches.open(CACHE.IMAGES);
  await Promise.allSettled(
    assets.slice(0, 20).map(async (asset) => {
      if (asset.posterUrl) {
        const req = new Request(asset.posterUrl, { mode: 'no-cors' });
        const cached = await imgCache.match(req);
        if (!cached) {
          const res = await fetch(req).catch(() => null);
          if (res) await imgCache.put(req, res);
        }
      }
      if (asset.videoUrl || asset.manifestUrl) {
        const url = asset.manifestUrl || asset.videoUrl;
        const req = new Request(url, { mode: 'no-cors' });
        const cached = await cache.match(req);
        if (!cached) {
          const res = await fetch(req).catch(() => null);
          if (res) await cache.put(req, res);
        }
      }
    })
  );
}

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { body: event.data?.text() }; }

  const title = payload.title || 'AfriWonder';
  const options = {
    body: payload.body || 'Nouvelle activité',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: payload.tag || 'general',
    data: payload.data || {},
    renotify: !!payload.tag,
    vibrate: [100, 50, 100],
    actions: payload.actions || [],
    timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      try {
        const nav = typeof globalThis !== 'undefined' ? globalThis.navigator : null;
        if (nav && typeof nav.setAppBadge === 'function') {
          const notes = await self.registration.getNotifications();
          await nav.setAppBadge(notes.length);
        }
      } catch {
        // Badge optionnel : ne doit pas faire échouer l’affichage de la notification
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action || '';
  const actionUrls = (data.actionUrls && typeof data.actionUrls === 'object') ? data.actionUrls : {};
  let url = data.url || '/';
  if (action === 'answer-audio' && typeof actionUrls.answerAudio === 'string') {
    url = actionUrls.answerAudio;
  } else if (action === 'answer-video' && typeof actionUrls.answerVideo === 'string') {
    url = actionUrls.answerVideo;
  } else if (action === 'send-message' && typeof actionUrls.message === 'string') {
    url = actionUrls.message;
  }
  if (typeof url !== 'string' || !url.trim()) url = '/';
  url = url.trim();
  if (url.startsWith('/')) {
    url = self.location.origin + url;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existingClient = clients.find(c => c.url.includes(self.location.origin));
      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

// ─── Share Target (partage système → app) ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('/share-target') && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const url = formData.get('url') || '';
        const files = formData.getAll('files');

        const shareData = { title, text, url, hasFiles: files.length > 0 };

        // Stocker en IndexedDB pour que React le récupère
        const db = await openShareDB();
        const tx = db.transaction('shares', 'readwrite');
        await tx.objectStore('shares').put(shareData, 'pending');
        await tx.done;

        return Response.redirect('/Create?from=share', 303);
      })()
    );
  }
});

async function openShareDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('afw-share', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('shares');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}
