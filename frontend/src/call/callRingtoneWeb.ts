import { RING_PULSE_MS, type CallRingPreset } from './callRingtoneTiming';

import INCOMING_WAV from '../../assets/sounds/incoming_call.wav';
import OUTGOING_WAV from '../../assets/sounds/outgoing_ringback.wav';

/** Résout l’URL servie par Metro / Expo web pour un asset WAV. */
export function resolveWebBundledSoundUri(moduleRef: unknown): string {
  if (typeof moduleRef === 'string') return moduleRef;
  if (moduleRef && typeof moduleRef === 'object') {
    const record = moduleRef as Record<string, unknown>;
    if (typeof record.uri === 'string' && record.uri.trim()) return record.uri;
    if (record.default != null) return resolveWebBundledSoundUri(record.default);
  }
  return String(moduleRef ?? '').trim();
}

const activeWebRingStops = new Set<() => Promise<void>>();

/** Coupe toutes les sonneries web actives (overlay entrant, ringback orphelin). */
export async function stopAllWebCallRings(): Promise<void> {
  const stops = [...activeWebRingStops];
  activeWebRingStops.clear();
  await Promise.all(stops.map((stop) => stop().catch(() => {})));
}

/**
 * Sonnerie pulsée navigateur (HTMLAudioElement) — ringback appelant / sonnerie entrante.
 */
export function startPulsedCallRingWeb(
  volume: number,
  preset: CallRingPreset,
): () => Promise<void> {
  const { burstMs, pauseMs } = RING_PULSE_MS[preset];
  const src = resolveWebBundledSoundUri(preset === 'outgoing' ? OUTGOING_WAV : INCOMING_WAV);
  let cancelled = false;
  let active: HTMLAudioElement | null = null;
  let burstTimer: ReturnType<typeof setTimeout> | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (burstTimer) {
      clearTimeout(burstTimer);
      burstTimer = null;
    }
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  };

  const stopActive = () => {
    if (!active) return;
    try {
      active.pause();
      active.currentTime = 0;
    } catch {
      /* ignore */
    }
    active.removeAttribute('src');
    active.srcObject = null;
    active = null;
  };

  const scheduleNextBurst = () => {
    if (cancelled) return;
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      playBurst();
    }, pauseMs);
  };

  const playBurst = () => {
    if (cancelled || !src) {
      if (!cancelled && !src) scheduleNextBurst();
      return;
    }
    stopActive();
    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0.05, volume));
    active = audio;
    void audio.play().catch(() => {
      if (!cancelled) scheduleNextBurst();
    });
    burstTimer = setTimeout(() => {
      burstTimer = null;
      stopActive();
      if (!cancelled) scheduleNextBurst();
    }, burstMs);
  };

  playBurst();

  const stop = async () => {
    cancelled = true;
    clearTimers();
    stopActive();
  };

  const trackedStop = async () => {
    activeWebRingStops.delete(trackedStop);
    await stop();
  };

  activeWebRingStops.add(trackedStop);
  return trackedStop;
}
