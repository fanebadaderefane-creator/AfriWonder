import { devWarn } from '../utils/devLog';

/** Active via __DEV__ ou EXPO_PUBLIC_CALL_DEBUG=1 (diagnostic appels WebRTC). */
export function isCallDebugEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  try {
    return String(process.env.EXPO_PUBLIC_CALL_DEBUG || '').trim() === '1';
  } catch {
    return false;
  }
}

export function logCallPhase(
  callId: string,
  phase: string,
  data?: Record<string, unknown>,
): void {
  if (!isCallDebugEnabled()) return;
  devWarn(
    '[Call]',
    JSON.stringify({
      tag: 'AFW_CALL',
      callId,
      phase,
      ts: Date.now(),
      ...data,
    }),
  );
}

export function sdpContainsMedia(sdp: string | undefined, media: 'audio' | 'video'): boolean {
  if (!sdp) return false;
  return sdp.includes(media === 'audio' ? 'm=audio' : 'm=video');
}
