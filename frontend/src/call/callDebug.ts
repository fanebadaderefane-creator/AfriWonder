import { addSentryBreadcrumb } from '../lib/sentryMobile';
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

const SENTRY_SKIP_PHASES = new Set(['ice_local', 'stats', 'remote_stream_updated']);

/** En prod Play Store : fil d’Ariane Sentry sans spammer la console. */
export function shouldBreadcrumbCallPhase(phase: string): boolean {
  if (SENTRY_SKIP_PHASES.has(phase)) return false;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return false;
  return true;
}

export function logCallPhase(
  callId: string,
  phase: string,
  data?: Record<string, unknown>,
): void {
  if (isCallDebugEnabled()) {
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

  if (shouldBreadcrumbCallPhase(phase)) {
    addSentryBreadcrumb('afw_call', phase, {
      callId,
      ts: Date.now(),
      ...data,
    });
  }
}

export function sdpContainsMedia(sdp: string | undefined, media: 'audio' | 'video'): boolean {
  if (!sdp) return false;
  return sdp.includes(media === 'audio' ? 'm=audio' : 'm=video');
}
