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
