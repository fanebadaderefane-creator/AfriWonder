import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { getItem, setItem, removeItem } from '@/utils/safeStorage';
import { STORAGE_KEYS } from '@/lib/persistence-registry.js';
import { isEffectiveConnectionSlow } from '@/lib/networkHints.js';

// Flutter : miroir avec hydrate / stockage local (Hive, Isar…) + même clés de query ('feed', 'videos', …).
// gcTime — requis pour la persistance (doit être >= maxAge du persister). 48h pour usage offline intermittent (audit).
const CACHE_48H = 1000 * 60 * 60 * 48;
/** 2G/3G/saveData : plus de tentatives TanStack (en plus des retries axios) pour données critiques offline-first. */
const QUERY_RETRY_MAX_FAST = 2;
const QUERY_RETRY_MAX_SLOW = 4;
const QUERY_RETRY_DELAY_CAP_FAST_MS = 10_000;
const QUERY_RETRY_DELAY_CAP_SLOW_MS = 16_000;

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_48H,
      // PWA / 3G intermittent : éviter rafraîchissements agressifs ; les écrans critiques surchargent si besoin.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        const slow = typeof navigator !== 'undefined' && isEffectiveConnectionSlow();
        const max = slow ? QUERY_RETRY_MAX_SLOW : QUERY_RETRY_MAX_FAST;
        if (failureCount >= max) return false;
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        // Passerelles / surcharge courte : une nouvelle tentative peut réussir (réseaux instables).
        if (status === 429 && failureCount >= 1) return false;
        return true;
      },
      retryDelay: (attemptIndex) => {
        const slow = typeof navigator !== 'undefined' && isEffectiveConnectionSlow();
        const cap = slow ? QUERY_RETRY_DELAY_CAP_SLOW_MS : QUERY_RETRY_DELAY_CAP_FAST_MS;
        return Math.min(1000 * 2 ** attemptIndex, cap);
      },
      // Audits Complet / Senior v2 — connexions intermittentes (3G, retour app)
      staleTime: 5 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
    },
  },
});

/** Persister localStorage via safeStorage (tolérant mode privé / quota). Cache feed, vidéos, etc. */
// 2G/3G/saveData : espacer les écritures JSON (moins de jank + moins de risque quota sur bas de gamme).
const QUERY_PERSIST_THROTTLE_MS =
  typeof navigator !== 'undefined' && isEffectiveConnectionSlow() ? 4500 : 2200;

export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => getItem(key),
    setItem: (key, value) => {
      setItem(key, value);
    },
    removeItem: (key) => {
      removeItem(key);
    },
  },
  key: STORAGE_KEYS.REACT_QUERY_CACHE,
  throttleTime: QUERY_PERSIST_THROTTLE_MS,
});