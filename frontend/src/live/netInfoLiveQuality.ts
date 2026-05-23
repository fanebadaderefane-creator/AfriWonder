import type { NetInfoState } from '@react-native-community/netinfo';
import type { LiveVideoQuality } from './liveVideoQuality';

export type NetworkQualityTier = 'low' | 'medium' | 'high';

/**
 * Estime la qualité réseau pour le spectateur (direct live).
 * Conservateur : en cas de doute → medium ou low.
 */
export function networkTierFromNetInfo(state: NetInfoState | null): NetworkQualityTier {
  if (!state?.isConnected) return 'low';
  if (state.isInternetReachable === false) return 'low';

  if (state.type === 'wifi' || state.type === 'ethernet' || state.type === 'unknown') {
    return 'high';
  }

  if (state.type === 'cellular') {
    const d = state.details as { cellularGeneration?: string } | null;
    const gen = String(d?.cellularGeneration || '').toLowerCase();
    if (gen.includes('2g') || gen === 'g2') return 'low';
    if (gen.includes('3g') || gen === 'g3') return 'low';
    if (gen.includes('4g') || gen === 'g4' || gen.includes('lte')) return 'medium';
    if (gen.includes('5g')) return 'high';
    return 'medium';
  }

  return 'medium';
}

/** Si l’utilisateur a choisi Auto, mappe le tier réseau vers une résolution de réception. */
export function resolveEffectiveLiveQuality(
  userChoice: LiveVideoQuality,
  tier: NetworkQualityTier,
): LiveVideoQuality {
  if (userChoice !== 'auto') return userChoice;
  if (tier === 'low') return '360p';
  if (tier === 'medium') return '540p';
  return '720p';
}
