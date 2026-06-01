/**
 * Pre-warm du backend AfriWonder au démarrage de l'app.
 *
 * Pourquoi : `https://afriwonder.onrender.com` (Render free tier) **dort** après ~15 min
 * d'inactivité. Le 1er request prend alors 30-60s pour réveiller le serveur — pendant
 * ce temps, axios timeout (par défaut 30s) et l'utilisateur voit "connexion interrompue"
 * alors que le serveur va bien.
 *
 * Stratégie :
 *  1. Au boot de l'app (depuis `_layout.tsx`), on déclenche un `GET /health` en background
 *  2. Si échec / timeout : retry après 3s, 8s, 20s (progressif)
 *  3. On ne bloque jamais l'UI — c'est best-effort
 *  4. On expose un état observable pour afficher "Connexion au serveur..." si l'utilisateur
 *     tente une action avant que le pre-warm n'ait abouti.
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getBackendOrigin, MISSING_BACKEND_URL_SENTINEL } from '../config/backendBase';
import { applyAfriDeviceTrustToFetchInit } from '../utils/afwDeviceRequestId';

export type BackendWarmupState = 'idle' | 'warming' | 'awake' | 'unreachable';

interface WarmupListener {
  (state: BackendWarmupState): void;
}

let currentState: BackendWarmupState = 'idle';
let lastSuccessAt: number | null = null;
const listeners: Set<WarmupListener> = new Set();
let activePromise: Promise<boolean> | null = null;

function notify(next: BackendWarmupState) {
  if (currentState === next) return;
  currentState = next;
  for (const l of listeners) {
    try {
      l(next);
    } catch {
      /* ignore */
    }
  }
}

export function getBackendWarmupState(): BackendWarmupState {
  return currentState;
}

export function getBackendLastSuccessAt(): number | null {
  return lastSuccessAt;
}

export function subscribeBackendWarmup(listener: WarmupListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function pingHealth(timeoutMs: number): Promise<boolean> {
  const origin = getBackendOrigin();
  if (!origin || origin === MISSING_BACKEND_URL_SENTINEL) return false;
  const url = `${origin.replace(/\/$/, '')}/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      /* */
    }
  }, timeoutMs);
  try {
    const res = await fetch(
      url,
      applyAfriDeviceTrustToFetchInit({
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }),
    );
    clearTimeout(timer);
    if (!res.ok) return false;
    return true;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

const WARMUP_ATTEMPTS_FULL: { delayMs: number; timeoutMs: number }[] = [
  { delayMs: 0, timeoutMs: 8_000 },
  { delayMs: 3_000, timeoutMs: 15_000 },
  { delayMs: 8_000, timeoutMs: 30_000 },
  { delayMs: 20_000, timeoutMs: 60_000 },
];

/** Cellulaire : 2 pings courts (fluide au 1er feed) au lieu de 4 longs. */
const WARMUP_ATTEMPTS_LIGHT: { delayMs: number; timeoutMs: number }[] = [
  { delayMs: 0, timeoutMs: 6_000 },
  { delayMs: 4_000, timeoutMs: 12_000 },
];

/**
 * Idempotent : plusieurs appels concurrents partagent la même promesse.
 * Renvoie `true` si le serveur répond avant l'épuisement des retries.
 */
async function resolveWarmupAttempts(): Promise<{ delayMs: number; timeoutMs: number }[]> {
  if (Platform.OS === 'web') return WARMUP_ATTEMPTS_FULL;
  try {
    const state = await NetInfo.fetch();
    if (state.type === 'cellular') {
      return WARMUP_ATTEMPTS_LIGHT;
    }
  } catch {
    /* ignore */
  }
  return WARMUP_ATTEMPTS_FULL;
}

export function warmupBackend(): Promise<boolean> {
  if (activePromise) return activePromise;
  if (currentState === 'awake' && lastSuccessAt && Date.now() - lastSuccessAt < 60_000) {
    return Promise.resolve(true);
  }
  notify('warming');
  activePromise = (async () => {
    const attempts = await resolveWarmupAttempts();
    for (const attempt of attempts) {
      if (attempt.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
      }
      const ok = await pingHealth(attempt.timeoutMs);
      if (ok) {
        lastSuccessAt = Date.now();
        notify('awake');
        return true;
      }
    }
    notify('unreachable');
    return false;
  })()
    .finally(() => {
      activePromise = null;
    });
  return activePromise;
}

/**
 * Hook léger pour les écrans qui veulent un message si le backend dort encore.
 * Évite de dépendre de Zustand juste pour ça.
 */
export function startBackendWarmupAtBoot(): void {
  // Web : le navigateur gère lui-même les keep-alive ; pas de cold start Render visible
  // (le 1er request peut être lent mais l'utilisateur ne perçoit pas l'attente comme un bug).
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location?.hostname === 'localhost') return;
  }
  /** Wi‑Fi : warmup complet ; cellulaire : ping unique (cf. resolveWarmupAttempts). */
  void warmupBackend();
}
