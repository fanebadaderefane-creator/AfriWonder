import { Platform } from 'react-native';
import { trimMobileAppCaches } from '../lib/mobileMemoryMaintenance';

/**
 * Libère de la RAM avant d’ouvrir WebRTC (micro/caméra + PeerConnection).
 * Réduit les fermetures Android/iOS au lancement d’un appel vocal ou vidéo.
 */
export function prepareCallSessionMemory(): void {
  if (Platform.OS === 'web') return;
  trimMobileAppCaches('call-screen-enter', { force: true });
}

/**
 * Nettoyage après fin d’appel ou sortie de l’écran — caches image + React Query inactif.
 */
export function releaseCallSessionMemory(): void {
  if (Platform.OS === 'web') return;
  trimMobileAppCaches('call-screen-exit', { force: true });
}
