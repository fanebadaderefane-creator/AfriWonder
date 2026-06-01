export type NativeCallLaunchBlockReason =
  | 'web_no_webrtc'
  | 'feature_disabled'
  | 'no_webrtc_module'
  | 'missing_peer';

export function getNativeCallLaunchBlockReason(input: {
  platformOs: string;
  callsOnNative: boolean;
  hasWebRtcRuntime: boolean;
  peerUserId: string;
}): NativeCallLaunchBlockReason | null {
  if (!input.callsOnNative) return 'feature_disabled';
  if (!input.hasWebRtcRuntime) {
    return input.platformOs === 'web' ? 'web_no_webrtc' : 'no_webrtc_module';
  }
  if (!String(input.peerUserId || '').trim()) return 'missing_peer';
  return null;
}

export function nativeCallLaunchBlockedMessage(reason: NativeCallLaunchBlockReason): string {
  switch (reason) {
    case 'web_no_webrtc':
      return 'Votre navigateur ne prend pas en charge les appels (WebRTC). Utilisez Chrome ou Firefox récent, ou l’application mobile AfriWonder.';
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
