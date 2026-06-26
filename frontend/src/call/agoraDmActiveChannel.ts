/**
 * Moteur Agora canal DM — survit au démontage React (ErrorBoundary / appel fantôme).
 */
import type { IRtcEngine } from 'react-native-agora';
import { logAfwCall } from './callDiagnosticLog';
import { clearCallMediaAlive, syncAgoraCallMediaAlive } from './callMediaAliveRegistry';

type ActiveChannel = {
  callId: string;
  engine: IRtcEngine;
};

let activeChannel: ActiveChannel | null = null;

export function registerAgoraDmActiveChannel(callId: string, engine: IRtcEngine): void {
  if (!callId || !engine) return;
  activeChannel = { callId, engine };
  syncAgoraCallMediaAlive({ callId, alive: true, callState: 'connected' });
}

export function clearAgoraDmActiveChannel(callId?: string): void {
  if (!activeChannel) return;
  if (callId && activeChannel.callId !== callId) return;
  activeChannel = null;
  clearCallMediaAlive('agora');
}

export function peekAgoraDmActiveChannelCallId(): string | null {
  return activeChannel?.callId ?? null;
}

/** Quitte le canal Agora même si l’écran d’appel a crashé. */
export async function forceLeaveAgoraDmActiveChannel(reason: string): Promise<boolean> {
  const entry = activeChannel;
  if (!entry) return false;
  activeChannel = null;
  const { callId, engine } = entry;
  try {
    await engine.leaveChannel();
  } catch {
    /* ignore */
  }
  try {
    engine.release();
  } catch {
    /* ignore */
  }
  logAfwCall('agora_force_channel_leave', { callId, reason });
  return true;
}
