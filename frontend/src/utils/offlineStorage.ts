import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'afriwonder_cache_';
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheMeta {
  timestamp: number;
  ttl: number;
}

export const OfflineStorage = {
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const cacheKey = CACHE_PREFIX + key;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      const meta: CacheMeta = { timestamp: Date.now(), ttl };
      await AsyncStorage.setItem(cacheKey + '_meta', JSON.stringify(meta));
    } catch (e) {
      console.warn('[OfflineStorage] set error:', e);
    }
  },

  async get<T>(key: string): Promise<{ data: T | null; isStale: boolean; age: number }> {
    try {
      const cacheKey = CACHE_PREFIX + key;
      const [rawData, rawMeta] = await AsyncStorage.multiGet([cacheKey, cacheKey + '_meta']);
      
      if (!rawData[1]) return { data: null, isStale: true, age: 0 };
      
      const data: T = JSON.parse(rawData[1]);
      const meta: CacheMeta = rawMeta[1] ? JSON.parse(rawMeta[1]) : { timestamp: 0, ttl: 0 };
      const age = Date.now() - meta.timestamp;
      const isStale = age > meta.ttl;
      
      return { data, isStale, age };
    } catch (e) {
      console.warn('[OfflineStorage] get error:', e);
      return { data: null, isStale: true, age: 0 };
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const cacheKey = CACHE_PREFIX + key;
      await AsyncStorage.multiRemove([cacheKey, cacheKey + '_meta']);
    } catch (e) {
      console.warn('[OfflineStorage] remove error:', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
    } catch (e) {
      console.warn('[OfflineStorage] clearAll error:', e);
    }
  },

  async getCacheSize(): Promise<{ keys: number; estimatedBytes: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      let estimatedBytes = 0;
      for (const key of cacheKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val) estimatedBytes += val.length * 2;
      }
      return { keys: cacheKeys.length, estimatedBytes };
    } catch (_e) {
      return { keys: 0, estimatedBytes: 0 };
    }
  },
};
