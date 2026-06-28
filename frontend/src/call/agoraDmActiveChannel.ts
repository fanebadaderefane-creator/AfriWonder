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

export function registerAgoraDmActiveChannel(
  callId: string,
  engine: IRtcEngine,
  callState: 'connecting' | 'connected' = 'connecting',
): void {
  if (!callId || !engine) return;
  activeChannel = { callId, engine };
  syncAgoraCallMediaAlive({ callId, alive: true, callState });
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

/** Met à jour le snapshot média pour ErrorBoundary / recovery (canal déjà joint). */
export function touchAgoraDmActiveChannelCallState(
  callId: string,
  callState: 'connecting' | 'connected',
): void {
  if (!activeChannel || activeChannel.callId !== callId) return;
  syncAgoraCallMediaAlive({ callId, alive: true, callState });
}

export function peekAgoraDmActiveChannelEngine(): IRtcEngine | null {
  return activeChannel?.engine ?? null;
}

/** Ne quitte le canal actif que s'il appartient à un autre callId (recovery / preview). */
export async function forceLeaveAgoraDmActiveChannelIfStale(
  joinCallId: string,
  reason: string,
): Promise<boolean> {
  const entry = activeChannel;
  if (!entry || entry.callId === joinCallId) return false;
  return forceLeaveAgoraDmActiveChannel(reason);
}

/** invite:ack — réaligner le canal actif sans leave (évite kill mid-call). */
export function migrateAgoraDmActiveChannelCallId(fromId: string, toId: string): boolean {
  if (!activeChannel || activeChannel.callId !== fromId || !toId) return false;
  activeChannel = { callId: toId, engine: activeChannel.engine };
  syncAgoraCallMediaAlive({ callId: toId, alive: true, callState: 'connecting' });
  logAfwCall('agora_active_channel_id_migrated', { fromId, toId });
  return true;
}

/** Quitte le canal Agora même si l’écran d’appel a crashé. */
export async function forceLeaveAgoraDmActiveChannel(reason: string): Promise<boolean> {
  const entry = activeChannel;
  if (!entry) return false;
  activeChannel = null;
  clearCallMediaAlive('agora');
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
