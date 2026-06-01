import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { RING_PULSE_MS, type CallRingPreset } from './callRingtoneTiming';

/** Sonnerie entrante (style WhatsApp : tiiiii — pause — tiiiii). */
const INCOMING_WAV = require('../../assets/sounds/incoming_call.wav');
/** Tonalité d’attente appelant — fichier distinct (ringback plus court). */
const OUTGOING_WAV = require('../../assets/sounds/outgoing_ringback.wav');

export type { CallRingPreset } from './callRingtoneTiming';
export { ringPulseTiming } from './callRingtoneTiming';

/** Réglage lecture forte pour la sonnerie entrante (sans micro — n’écrase pas la session d’un appel en cours). */
async function applyIncomingRingAudioMode(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Sonnerie pulsée : joue une rafale, coupe, pause, recommence (jamais de boucle continue sur le WAV).
 * Retourne une fonction à appeler pour tout arrêter (unload inclus).
 */
async function startPulsedCallRing(
  volume: number,
  preset: CallRingPreset,
): Promise<() => Promise<void>> {
  if (Platform.OS === 'web') {
    return async () => {};
  }
  if (preset === 'incoming') {
    await applyIncomingRingAudioMode();
  }

  const { burstMs, pauseMs } = RING_PULSE_MS[preset];
  const soundAsset = preset === 'outgoing' ? OUTGOING_WAV : INCOMING_WAV;
  let cancelled = false;
  let burstTimer: ReturnType<typeof setTimeout> | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let activeSound: InstanceType<typeof Audio.Sound> | null = null;

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

  const unloadSound = async () => {
    if (!activeSound) return;
    try {
      await activeSound.stopAsync();
    } catch {
      /* ignore */
    }
    try {
      await activeSound.unloadAsync();
    } catch {
      /* ignore */
    }
    activeSound = null;
  };

  const scheduleNextBurst = () => {
    if (cancelled) return;
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      void playBurst();
    }, pauseMs);
  };

  const playBurst = async () => {
    if (cancelled) return;
    await unloadSound();
    try {
      const { sound } = await Audio.Sound.createAsync(soundAsset, {
        shouldPlay: true,
        isLooping: false,
        volume: Math.min(1, Math.max(0.05, volume)),
      });
      activeSound = sound;
      burstTimer = setTimeout(async () => {
        burstTimer = null;
        if (cancelled) {
          await unloadSound();
          return;
        }
        await unloadSound();
        scheduleNextBurst();
      }, burstMs);
    } catch {
      if (!cancelled) scheduleNextBurst();
    }
  };

  void playBurst();

  return async () => {
    cancelled = true;
    clearTimers();
    await unloadSound();
  };
}

/**
 * Sonnerie entrante (overlay / appel reçu) — impulsions avec silence, pas de « tiiiiii » continu.
 */
export async function startLoopingCallRing(
  volume = 0.9,
  opts?: { preset?: CallRingPreset },
): Promise<() => Promise<void>> {
  const preset = opts?.preset ?? 'incoming';
  return startPulsedCallRing(volume, preset);
}

/**
 * Tonalité d’attente pour l’appelant : rafale courte, silence, recommence (ringback).
 */
export async function startOutgoingRingbackPattern(volume = 0.58): Promise<() => Promise<void>> {
  return startPulsedCallRing(volume, 'outgoing');
}
