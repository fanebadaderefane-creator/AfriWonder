// src/sw-custom.js — Workbox professionnel AfriWonder
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly
} from 'workbox-strategies';
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
// NetworkFirst pour HTML avec fallback vers /offline.html si hors ligne
const networkFirstStrategy = new NetworkFirst({
  cacheName: CACHE.APP_SHELL,
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
  ],
});

registerRoute(
  new NavigationRoute(async ({ event }) => {
    // Utilise la réponse preloadée si dispo (Fix 10)
    try {
      const preloadResponse = await event.preloadResponse;
      if (preloadResponse) return preloadResponse;
    } catch {}
    return networkFirstStrategy.handle({ event });
  }, { allowlist: [/^(?!\/(api|socket\.io))/] })
);

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

// ─── API Feed (StaleWhileRevalidate — rapide même hors ligne) ─────────────────
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/feed') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: CACHE.FEED,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 10 * 60 }), // 10 min
    ],
  })
);

// ─── API REST générale (NetworkFirst — fallback cache) ────────────────────────
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && request.method === 'GET'
    && !url.pathname.startsWith('/api/feed'),
  new NetworkFirst({
    cacheName: CACHE.API,
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
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

// ─── Vidéos HLS / MP4 ────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    /\.(m3u8|ts|mp4|webm)(\?|$)/i.test(url.pathname) ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('r2.dev'),
  new CacheFirst({
    cacheName: CACHE.VIDEO,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200, 206] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 2 * 60 * 60 }),
    ],
  })
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
    assets.slice(0, 8).map(async (asset) => {
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
  let url = event.notification.data?.url || '/';
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
