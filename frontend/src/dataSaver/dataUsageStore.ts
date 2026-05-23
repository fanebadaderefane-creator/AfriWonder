/**
 * Store léger (Zustand) pour l'estimation des octets vidéo consommés par jour.
 *
 * POURQUOI : avant, l'estimateur poussait son `setState` dans un Context global
 * englobant le feed. Conséquence : pendant la lecture vidéo (1 tick/s), tout
 * l'arbre du feed (dont chaque `VideoItem` + FlashList) re-render — saccades
 * visibles sur Android bas de gamme / 3G.
 *
 * SOLUTION : isoler la valeur dans un store séparé.
 *   - Les composants qui affichent l'usage (Settings, banderole) s'abonnent
 *     via `useDataUsage()` et re-render uniquement eux-mêmes.
 *   - Le feed n'est PAS abonné, donc plus aucun re-render imposé par la
 *     lecture sur le fil chaud.
 *   - Les écritures `AsyncStorage` sont **batchées** (max 1 flush / 30 s) pour
 *     ne plus pinger le disque chaque seconde.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA_USAGE_STORAGE_KEY_PREFIX } from './dataSaverConstants';

const STORAGE_USAGE_PREFIX = DATA_USAGE_STORAGE_KEY_PREFIX;

/** Ordre de grandeur : flux ~240p vs ~720p (hors audio exact). */
const BYTES_PER_SEC_LOW = 18_000;
const BYTES_PER_SEC_HIGH = 220_000;

/** Intervalle minimum entre 2 écritures disque pour l'estimateur (ms). */
const FLUSH_INTERVAL_MS = 30_000;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DataUsageStore {
  /** Total estimé du jour, en octets. */
  todayBytes: number;
  /** Octets pas encore persistés sur disque (batch). */
  _pendingBytes: number;
  /** Date du dernier flush disque. */
  _lastFlushAt: number;
  /** Charge la valeur du jour depuis AsyncStorage. */
  refresh: () => Promise<void>;
  /** À appeler pendant la lecture (secondes réelles, qualité basse vrai/faux). */
  addPlayback: (seconds: number, lowQuality: boolean) => void;
  /** Force un flush disque immédiat (au passage en background). */
  flush: () => Promise<void>;
}

export const useDataUsageStore = create<DataUsageStore>((set, get) => ({
  todayBytes: 0,
  _pendingBytes: 0,
  _lastFlushAt: 0,

  refresh: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_USAGE_PREFIX + todayKey());
      const n = raw ? parseInt(raw, 10) : 0;
      set({ todayBytes: Number.isFinite(n) && n > 0 ? n : 0 });
    } catch {
      set({ todayBytes: 0 });
    }
  },

  addPlayback: (seconds: number, lowQuality: boolean) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const rate = lowQuality ? BYTES_PER_SEC_LOW : BYTES_PER_SEC_HIGH;
    const add = Math.round(seconds * rate);
    const state = get();
    const nextTotal = state.todayBytes + add;
    const nextPending = state._pendingBytes + add;

    set({ todayBytes: nextTotal, _pendingBytes: nextPending });

    const now = Date.now();
    if (now - state._lastFlushAt >= FLUSH_INTERVAL_MS) {
      void get().flush();
    }
  },

  flush: async () => {
    const state = get();
    if (state._pendingBytes <= 0) return;
    const key = STORAGE_USAGE_PREFIX + todayKey();
    try {
      const raw = await AsyncStorage.getItem(key);
      const prev = raw ? parseInt(raw, 10) : 0;
      const safePrev = Number.isFinite(prev) && prev > 0 ? prev : 0;
      const next = safePrev + state._pendingBytes;
      await AsyncStorage.setItem(key, String(next));
      set({ todayBytes: next, _pendingBytes: 0, _lastFlushAt: Date.now() });
    } catch {
      /* ignore — on retentera au prochain tick */
    }
  },
}));

/** Hook public — composants UI qui veulent afficher la valeur du jour. */
export function useDataUsage(): number {
  return useDataUsageStore((s) => s.todayBytes);
}

/** API impérative — utilisée par le feed pour push une seconde de lecture. */
export const dataUsage = {
  refresh: () => useDataUsageStore.getState().refresh(),
  add: (seconds: number, lowQuality: boolean) => useDataUsageStore.getState().addPlayback(seconds, lowQuality),
  flush: () => useDataUsageStore.getState().flush(),
};

export function formatDataEstimateBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 Mo';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
