import { Platform, Vibration } from 'react-native';
import { ringPulseTiming } from './callRingtoneTiming';

/** Volume sonnerie entrante (overlay) — audible sans être agressif. */
export const INCOMING_CALL_RING_VOLUME = 0.78;

/**
 * Une courte vibration au début de chaque « tiiii », puis silence (aligné sur `callRingtoneTiming`).
 * Évite `Vibration.vibrate(..., true)` qui vibre en continu sur Android.
 */
export function startIncomingCallVibration(): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }
  const { burstMs, pauseMs } = ringPulseTiming('incoming');
  const cycleMs = burstMs + pauseMs;
  let cancelled = false;

  const buzz = () => {
    if (cancelled) return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(320);
      } else {
        Vibration.vibrate(280);
      }
    } catch {
      /* ignore */
    }
  };

  buzz();
  const timer = setInterval(buzz, cycleMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
    try {
      Vibration.cancel();
    } catch {
      /* ignore */
    }
  };
}

/** Motif unique pour la notification Android (une vibration par affichage, pas en boucle). */
export const ANDROID_INCOMING_CALL_VIBRATION_PATTERN = [0, 320, 2700] as const;
