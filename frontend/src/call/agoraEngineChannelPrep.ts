/**
 * Préparation join canal — ERR_JOIN_CHANNEL_REJECTED (-17) après preview / appel fantôme.
 */
import type { IRtcEngine } from 'react-native-agora';
import { logAfwCall } from './callDiagnosticLog';
import {
  forceLeaveAgoraDmActiveChannel,
  peekAgoraDmActiveChannelCallId,
} from './agoraDmActiveChannel';

/** Agora SDK — moteur déjà dans un canal ou instance stale. */
export const AGORA_JOIN_CHANNEL_REJECTED = -17;

export function shouldRetryAgoraJoinAfterRejected(code: unknown): boolean {
  return Number(code) === AGORA_JOIN_CHANNEL_REJECTED;
}

/** leaveChannel sans release — garde preview caméra sur le même moteur. */
export async function leaveAgoraEngineChannelOnly(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const leave = (engine as { leaveChannel?: () => Promise<void> | number }).leaveChannel;
    if (typeof leave !== 'function') return;
    const ret = leave.call(engine);
    if (ret != null && typeof (ret as Promise<void>).then === 'function') {
      await ret;
    }
    logAfwCall('agora_engine_leave_before_join', meta ?? {});
  } catch {
    /* déjà hors canal */
  }
}

/** Quitte canal fantôme (autre callId) puis leaveChannel sur le moteur cible. */
export async function prepareAgoraEngineForChannelJoin(
  engine: IRtcEngine,
  callId: string,
): Promise<void> {
  const staleCallId = peekAgoraDmActiveChannelCallId();
  if (staleCallId && staleCallId !== callId) {
    await forceLeaveAgoraDmActiveChannel('pre_join_stale_other_call');
  }
  await leaveAgoraEngineChannelOnly(engine, { callId, phase: 'pre_join' });
}
