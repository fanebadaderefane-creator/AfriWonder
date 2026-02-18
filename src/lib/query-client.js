import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { getItem, setItem, removeItem } from '@/utils/safeStorage';

// gcTime 24h — requis pour la persistance (doit être >= maxAge du persister)
const CACHE_24H = 1000 * 60 * 60 * 24;

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_24H,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});

/** Persister localStorage via safeStorage (tolérant mode privé / quota). Cache feed, vidéos, etc. */
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
  key: 'afw_react_query_cache',
  throttleTime: 2000,
});