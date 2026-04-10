import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineStorage } from '../utils/offlineStorage';
import NetInfo from '@react-native-community/netinfo';

interface UseOfflineDataOptions<T> {
  cacheKey: string;
  fetcher?: () => Promise<T>;
  fallbackData: T;
  ttl?: number;
  autoRefresh?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T;
  isLoading: boolean;
  isOffline: boolean;
  isStale: boolean;
  isCached: boolean;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

export function useOfflineData<T>(options: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const { cacheKey, fetcher, fallbackData, ttl, autoRefresh = true } = options;
  const [data, setData] = useState<T>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Monitor network
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (mounted.current) setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  // Load from cache first, then fetch
  const loadData = useCallback(async () => {
    if (!mounted.current) return;
    setIsLoading(true);

    // Step 1: Load from cache
    const cached = await OfflineStorage.get<T>(cacheKey);
    if (cached.data !== null) {
      setData(cached.data);
      setIsCached(true);
      setIsStale(cached.isStale);
      setLastUpdated(Date.now() - cached.age);
    }

    // Step 2: Fetch fresh data (simulate for mocked app)
    if (fetcher && autoRefresh) {
      try {
        const freshData = await fetcher();
        if (mounted.current) {
          setData(freshData);
          setIsStale(false);
          setLastUpdated(Date.now());
          await OfflineStorage.set(cacheKey, freshData, ttl);
        }
      } catch (e) {
        // Use cached data on failure
        if (!cached.data && mounted.current) {
          setData(fallbackData);
          await OfflineStorage.set(cacheKey, fallbackData, ttl);
        }
      }
    } else if (!cached.data) {
      // No fetcher and no cache - use fallback
      setData(fallbackData);
      await OfflineStorage.set(cacheKey, fallbackData, ttl);
      setIsCached(true);
    }

    if (mounted.current) setIsLoading(false);
  }, [cacheKey, fetcher, fallbackData, ttl, autoRefresh]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { data, isLoading, isOffline, isStale, isCached, refresh, lastUpdated };
}
