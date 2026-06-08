/** Validation des URLs `MediaStream#toURL()` avant montage RTCView (crash natif si invalide). */

export function isValidNativeRtcStreamUrl(
  url: unknown,
  options?: { localUrl?: string; minLength?: number },
): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  const minLen = options?.minLength ?? 4;
  if (trimmed.length < minLen) return false;
  const local = String(options?.localUrl || '').trim();
  if (local && trimmed === local) return false;
  if (trimmed === 'null' || trimmed === 'undefined') return false;
  /** react-native-webrtc : URLs invalides connues pour crasher RTCView au rendu natif. */
  if (/^(null|undefined|0|false)$/i.test(trimmed)) return false;
  return true;
}

/**
 * RTCView audio distant : vocal en `connecting` dès URL valide (décodeur natif Android).
 * Vidéo : attendre `connected` pour limiter les crashs RTCView en sonnerie.
 */
export function shouldShowNativeRemoteAudioRtc(input: {
  isWeb: boolean;
  nativeRtcUnmounting: boolean;
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  isVideoCall: boolean;
  remoteStreamUrl: string;
  localStreamUrl: string;
}): boolean {
  if (input.isWeb || input.nativeRtcUnmounting) return false;
  if (input.callState === 'ended' || input.callState === 'ringing') return false;
  const urlOk = isValidNativeRtcStreamUrl(input.remoteStreamUrl, {
    localUrl: input.localStreamUrl,
  });
  if (!urlOk) return false;
  if (input.callState === 'connected') return true;
  return input.callState === 'connecting' && !input.isVideoCall;
}
