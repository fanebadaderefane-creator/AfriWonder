import { stopAllCallRings } from './callRingtone';
import { stopNativeCallAudioSession, stopNativeOutgoingRingback } from './callNativeMedia';

/**
 * Coupe toutes les sonneries / tonalités d’appel (expo-av, InCallManager ringback, session native).
 * À appeler au raccrochage, à la connexion média, et quand l’overlay entrant se ferme.
 */
export async function stopEveryCallRingAlert(): Promise<void> {
  await stopAllCallRings();
  await stopNativeOutgoingRingback();
  await stopNativeCallAudioSession();
}
