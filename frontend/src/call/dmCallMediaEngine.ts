/**
 * Média appels DM 1:1 : Agora sur natif (défaut), WebRTC sur Expo web.
 */
import { Platform } from 'react-native';
import { featureFlags } from '../config/featureFlags';

export function shouldUseAgoraDmCalls(): boolean {
  if (Platform.OS === 'web') return false;
  return featureFlags.dmCallsAgora;
}
