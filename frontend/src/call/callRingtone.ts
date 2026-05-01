import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

/** Sonnerie appel (boucle). Remplaçable par un vrai ringtone produit sans changer le code. */
const INCOMING_WAV = require('../../assets/sounds/incoming_call.wav');

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

export type CallRingPreset = 'incoming' | 'outgoing';

/**
 * Sonnerie ou tonalité d’attente en boucle (mobile uniquement).
 * - `incoming` : optimise la session pour une sonnerie forte (overlay entrant).
 * - `outgoing` : ne touche pas à la session — l’écran d’appel règle déjà micro/haut-parleur.
 *
 * Retourne une fonction à appeler pour tout arrêter (unload inclus).
 */
export async function startLoopingCallRing(
  volume = 0.9,
  opts?: { preset?: CallRingPreset },
): Promise<() => Promise<void>> {
  if (Platform.OS === 'web') {
    return async () => {};
  }
  const preset = opts?.preset ?? 'incoming';
  if (preset === 'incoming') {
    await applyIncomingRingAudioMode();
  }
  try {
    const { sound } = await Audio.Sound.createAsync(INCOMING_WAV, {
      shouldPlay: true,
      isLooping: true,
      volume: Math.min(1, Math.max(0.05, volume)),
    });
    return async () => {
      try {
        await sound.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return async () => {};
  }
}
