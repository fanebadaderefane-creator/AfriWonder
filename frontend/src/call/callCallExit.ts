/**
 * Journal obligatoire avant toute fermeture d'appel — repère la pile d'appel exacte.
 * Toujours émis via console.error (visible Logcat / Chrome) même sans EXPO_PUBLIC_CALL_DEBUG.
 * En build release Play Store avec EXPO_PUBLIC_SENTRY_DSN, les échecs remontent aussi dans Sentry.
 */
import { captureSentryMessage } from '../lib/sentryMobile';

export type CallExitReason =
  | 'ended'
  | 'failed'
  | 'declined'
  | 'cancelled'
  | 'missed';

/** Évite le bruit Sentry (décrochage normal, refus, sonnerie expirée). */
export function shouldReportCallExitToSentry(
  reason: CallExitReason,
  meta?: Record<string, unknown>,
): boolean {
  if (reason === 'failed') return true;
  if (reason === 'cancelled') {
    const state = String(meta?.callState || '');
    return state === 'connecting' || state === 'ringing';
  }
  return false;
}

export function logCallExit(
  reason: CallExitReason,
  meta?: Record<string, unknown>,
): void {
  const stack = new Error().stack ?? '';
  console.error(
    '[AFW_CALL_EXIT]',
    reason,
    JSON.stringify({
      ts: Date.now(),
      ...meta,
    }),
    stack,
  );

  if (!shouldReportCallExitToSentry(reason, meta)) return;

  captureSentryMessage(
    `afw_call_exit:${reason}`,
    reason === 'failed' ? 'error' : 'warning',
    {
      feature: 'webrtc_call',
      reason,
      stack,
      ...meta,
    },
  );
}
