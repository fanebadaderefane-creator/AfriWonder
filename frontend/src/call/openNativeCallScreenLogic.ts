export type NativeCallLaunchBlockReason =
  | 'web'
  | 'feature_disabled'
  | 'no_webrtc_module'
  | 'missing_peer';

export function getNativeCallLaunchBlockReason(input: {
  platformOs: string;
  callsOnNative: boolean;
  hasWebRtcModule: boolean;
  peerUserId: string;
}): NativeCallLaunchBlockReason | null {
  if (input.platformOs === 'web') return 'web';
  if (!input.callsOnNative) return 'feature_disabled';
  if (!input.hasWebRtcModule) return 'no_webrtc_module';
  if (!String(input.peerUserId || '').trim()) return 'missing_peer';
  return null;
}

export function nativeCallLaunchBlockedMessage(reason: NativeCallLaunchBlockReason): string {
  switch (reason) {
    case 'web':
      return 'Les appels audio/vidéo sont disponibles sur l’application mobile Android ou iOS.';
    case 'feature_disabled':
      return 'Les appels sont temporairement désactivés sur cette version.';
    case 'no_webrtc_module':
      return 'Les appels nécessitent l’application AfriWonder installée (APK ou App Store). Expo Go ne prend pas en charge WebRTC.';
    case 'missing_peer':
      return 'Impossible d’appeler : contact introuvable.';
    default:
      return 'Appel indisponible.';
  }
}
