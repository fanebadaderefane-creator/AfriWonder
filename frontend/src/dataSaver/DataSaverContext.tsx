import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { dataUsage, formatDataEstimateBytes, useDataUsage } from './dataUsageStore';

const STORAGE_REDUCE_ANIM = 'afw_reduce_animations_v1';

export { formatDataEstimateBytes };

interface DataSaverContextValue {
  /** Préférence utilisateur OU réseau 2G/3G détecté. */
  effectiveDataSaver: boolean;
  /** Uniquement préférence compte (API / store). */
  manualDataSaver: boolean;
  /** Connexion cellulaire lente détectée (2G/3G). */
  autoSlowNetwork: boolean;
  /**
   * Conservé pour l'API du contexte ; le fil vertical autoplay comme TikTok.
   * L'économie de données (`effectiveDataSaver`) agit surtout sur la qualité et le préchargement.
   */
  tapToPlayOnly: boolean;
  /** Réduire animations (disque, cœurs) — batterie + confort. */
  reduceAnimations: boolean;
  setReduceAnimations: (v: boolean) => Promise<void>;
  /** Force un refresh disque de la valeur du jour (rare). */
  refreshTodayUsage: () => Promise<void>;
  /** À appeler pendant la lecture (secondes réelles, qualité). Batché. */
  addPlaybackEstimate: (seconds: number, lowQuality: boolean) => void;
}

const DataSaverContext = createContext<DataSaverContextValue | null>(null);

export function DataSaverProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const manualDataSaver = Boolean(user?.data_saver_mode);
  const [autoSlowNetwork, setAutoSlowNetwork] = useState(false);
  const [reduceAnimations, setReduceState] = useState(false);

  const refreshTodayUsage = useCallback(async () => {
    await dataUsage.refresh();
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_REDUCE_ANIM).then((v) => setReduceState(v === '1'));
    void dataUsage.refresh();
  }, []);

  // Flush l'estimateur disque quand l'app passe en background → rien n'est perdu.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void dataUsage.flush();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const apply = (state: import('@react-native-community/netinfo').NetInfoState) => {
      const details = state.details as { cellularGeneration?: string; isConnectionExpensive?: boolean } | null;
      const cg = details && typeof details.cellularGeneration === 'string' ? details.cellularGeneration : null;
      const expensive = Boolean(details?.isConnectionExpensive);
      /**
       * Sur mobile réel, des réseaux "4g" peuvent rester très instables/contraints.
       * On active aussi le mode économe quand la connexion cellulaire est marquée
       * "expensive" pour favoriser les flux plus légers et un démarrage vidéo plus rapide.
       */
      const slow = state.type === 'cellular' && (cg === '2g' || cg === '3g' || expensive);
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

  /**
   * Référence stable : ne fait QUE pousser dans le store Zustand séparé.
   * Aucun `setState` dans ce contexte → le feed ne re-render plus à chaque
   * seconde de lecture vidéo (gain majeur Android bas de gamme).
   */
  const addPlaybackEstimate = useCallback((seconds: number, lowQuality: boolean) => {
    dataUsage.add(seconds, lowQuality);
  }, []);

  const value = useMemo(
    (): DataSaverContextValue => ({
      effectiveDataSaver,
      manualDataSaver,
      autoSlowNetwork,
      tapToPlayOnly,
      reduceAnimations,
      setReduceAnimations,
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

/**
 * Compteur d'octets du jour — extrait dans un store séparé : seuls les
 * composants qui l'affichent (settings, badges) re-render quand il change.
 */
export function useTodayDataUsage(): number {
  return useDataUsage();
}
