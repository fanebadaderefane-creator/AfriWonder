import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';

const STORAGE_REDUCE_ANIM = 'afw_reduce_animations_v1';
const STORAGE_USAGE_PREFIX = 'afw_data_estimate_bytes_';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ordre de grandeur : flux ~240p vs ~720p (hors audio exact). */
const BYTES_PER_SEC_LOW = 18_000;
const BYTES_PER_SEC_HIGH = 220_000;

export function formatDataEstimateBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 Mo';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

interface DataSaverContextValue {
  /** Préférence utilisateur OU réseau 2G/3G détecté. */
  effectiveDataSaver: boolean;
  /** Uniquement préférence compte (API / store). */
  manualDataSaver: boolean;
  /** Connexion cellulaire lente détectée (2G/3G). */
  autoSlowNetwork: boolean;
  /**
   * Conservé pour l’API du contexte ; le fil vertical autoplay comme TikTok.
   * L’économie de données (`effectiveDataSaver`) agit surtout sur la qualité et le préchargement.
   */
  tapToPlayOnly: boolean;
  /** Réduire animations (disque, cœurs) — batterie + confort. */
  reduceAnimations: boolean;
  setReduceAnimations: (v: boolean) => Promise<void>;
  /** Estimation octets consommés aujourd’hui (lecture vidéo feed). */
  todayUsageBytes: number;
  refreshTodayUsage: () => Promise<void>;
  /** À appeler pendant la lecture (secondes réelles, qualité). */
  addPlaybackEstimate: (seconds: number, lowQuality: boolean) => void;
}

const DataSaverContext = createContext<DataSaverContextValue | null>(null);

export function DataSaverProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const manualDataSaver = Boolean(user?.data_saver_mode);
  const [autoSlowNetwork, setAutoSlowNetwork] = useState(false);
  const [reduceAnimations, setReduceState] = useState(false);
  const [todayUsageBytes, setTodayUsageBytes] = useState(0);

  const refreshTodayUsage = useCallback(async () => {
    try {
      const key = STORAGE_USAGE_PREFIX + todayKey();
      const raw = await AsyncStorage.getItem(key);
      const n = raw ? parseInt(raw, 10) : 0;
      setTodayUsageBytes(Number.isFinite(n) && n > 0 ? n : 0);
    } catch {
      setTodayUsageBytes(0);
    }
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_REDUCE_ANIM).then((v) => setReduceState(v === '1'));
    void refreshTodayUsage();
  }, [refreshTodayUsage]);

  useEffect(() => {
    const apply = (state: import('@react-native-community/netinfo').NetInfoState) => {
      const details = state.details as { cellularGeneration?: string } | null;
      const cg = details && typeof details.cellularGeneration === 'string' ? details.cellularGeneration : null;
      const slow = state.type === 'cellular' && (cg === '2g' || cg === '3g');
      setAutoSlowNetwork(slow);
    };
    void NetInfo.fetch().then(apply);
    const sub = NetInfo.addEventListener(apply);
    return () => sub();
  }, []);

  const effectiveDataSaver = manualDataSaver || autoSlowNetwork;
  const tapToPlayOnly = false;

  const setReduceAnimations = useCallback(async (v: boolean) => {
    setReduceState(v);
    try {
      await AsyncStorage.setItem(STORAGE_REDUCE_ANIM, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const addPlaybackEstimate = useCallback(
    (seconds: number, lowQuality: boolean) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      const rate = lowQuality ? BYTES_PER_SEC_LOW : BYTES_PER_SEC_HIGH;
      const add = Math.round(seconds * rate);
      const key = STORAGE_USAGE_PREFIX + todayKey();
      void (async () => {
        try {
          const raw = await AsyncStorage.getItem(key);
          const prev = raw ? parseInt(raw, 10) : 0;
          const next = (Number.isFinite(prev) ? prev : 0) + add;
          await AsyncStorage.setItem(key, String(next));
          setTodayUsageBytes(next);
        } catch {
          /* ignore */
        }
      })();
    },
    []
  );

  const value = useMemo(
    (): DataSaverContextValue => ({
      effectiveDataSaver,
      manualDataSaver,
      autoSlowNetwork,
      tapToPlayOnly,
      reduceAnimations,
      setReduceAnimations,
      todayUsageBytes,
      refreshTodayUsage,
      addPlaybackEstimate,
    }),
    [
      effectiveDataSaver,
      manualDataSaver,
      autoSlowNetwork,
      tapToPlayOnly,
      reduceAnimations,
      setReduceAnimations,
      todayUsageBytes,
      refreshTodayUsage,
      addPlaybackEstimate,
    ]
  );

  return <DataSaverContext.Provider value={value}>{children}</DataSaverContext.Provider>;
}

export function useDataSaver() {
  const ctx = useContext(DataSaverContext);
  if (!ctx) {
    throw new Error('useDataSaver must be used within DataSaverProvider');
  }
  return ctx;
}

/** Pour écrans hors provider (tests) : valeurs sûres. */
export function useDataSaverOptional(): DataSaverContextValue | null {
  return useContext(DataSaverContext);
}
