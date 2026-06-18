export type NativeCallLaunchBlockReason =
  | 'web_no_webrtc'
  | 'feature_disabled'
  | 'no_webrtc_module'
  | 'missing_peer';

export function getNativeCallLaunchBlockReason(input: {
  platformOs: string;
  callsOnNative: boolean;
  hasWebRtcRuntime: boolean;
  hasAgoraRtc?: boolean;
  dmCallsUseAgora?: boolean;
  peerUserId: string;
}): NativeCallLaunchBlockReason | null {
  if (!input.callsOnNative) return 'feature_disabled';
  const agoraPath =
    input.platformOs !== 'web' &&
    Boolean(input.dmCallsUseAgora) &&
    Boolean(input.hasAgoraRtc);
  if (!input.hasWebRtcRuntime && !agoraPath) {
    return input.platformOs === 'web' ? 'web_no_webrtc' : 'no_webrtc_module';
  }
  if (!String(input.peerUserId || '').trim()) return 'missing_peer';
  return null;
}

export type ReceiverCallScreenInput = {
  callId?: string;
  peerUserId: string;
  peerName: string;
  peerAvatar?: string;
  type: 'audio' | 'video';
};

/** Params Expo Router — rétro-compat `peerId` / `callType` + forme canonique `otherUserId` / `type`. */
export function buildReceiverCallRouteParams(input: ReceiverCallScreenInput): Record<string, string> {
  const peerUserId = String(input.peerUserId || '').trim();
  const peerName = String(input.peerName || 'Contact').trim() || 'Contact';
  const peerAvatar = String(input.peerAvatar || '').trim();
  const isVideo = input.type === 'video';
  const media = isVideo ? 'video' : 'audio';
  return {
    callId: String(input.callId || '').trim(),
    otherUserId: peerUserId,
    peerId: peerUserId,
    name: peerName,
    peerName,
    avatar: peerAvatar,
    peerAvatar,
    type: media,
    callType: media,
    role: 'receiver',
  };
}

export function nativeCallLaunchBlockedMessage(reason: NativeCallLaunchBlockReason): string {
  switch (reason) {
    case 'web_no_webrtc':
      return 'Votre navigateur ne prend pas en charge les appels (WebRTC). Utilisez Chrome ou Firefox récent, ou l’application mobile AfriWonder.';
    case 'feature_disabled':
      return 'Les appels sont temporairement désactivés sur cette version.';
    case 'no_webrtc_module':
      return 'Les appels nécessitent l’application AfriWonder installée (APK ou App Store).';
    case 'missing_peer':
      return 'Impossible d’appeler : contact introuvable.';
    default:
      return 'Appel indisponible.';
  }
}
