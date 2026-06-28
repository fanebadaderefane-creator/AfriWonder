/**
 * Logs diagnostic avant transitions UI « appel interrompu » — juin 2026.
 */

import { logAfwCall } from './callDiagnosticLog';
import {
  peekCallMediaAliveSnapshot,
  shouldSuppressCallInterruptedUi,
  type CallMediaAliveSnapshot,
} from './callMediaAliveRegistry';

export type CallUiStateLogInput = {
  phase: string;
  callState?: string | null;
  connectionState?: string | null;
  iceConnectionState?: string | null;
  signalingState?: string | null;
  localStreamPresent?: boolean;
  remoteStreamPresent?: boolean;
  localAudioTracks?: number;
  remoteAudioTracks?: number;
  localVideoTracks?: number;
  remoteVideoTracks?: number;
  exitSource?: string | null;
  reason?: string | null;
  engine?: string | null;
  callId?: string | null;
};

export type WhyCallInterruptedInput = {
  reason: string;
  exitSource?: string | null;
  error?: unknown;
  componentStack?: string | null;
  fileHint?: string | null;
  callState?: string | null;
  connectionState?: string | null;
  iceConnectionState?: string | null;
};

function serializeError(error: unknown): Record<string, string> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: String(error.stack ?? '').slice(0, 1200),
    };
  }
  return { message: String(error ?? 'unknown') };
}

export function buildCallUiStatePayload(
  input: CallUiStateLogInput,
): Record<string, unknown> {
  const alive = peekCallMediaAliveSnapshot();
  return {
    phase: input.phase,
    callState: input.callState ?? alive.callState ?? null,
    connectionState: input.connectionState ?? alive.connectionState ?? null,
    iceConnectionState: input.iceConnectionState ?? alive.iceConnectionState ?? null,
    signalingState: input.signalingState ?? alive.signalingState ?? null,
    localStreamPresent:
      input.localStreamPresent ?? alive.localStreamPresent ?? false,
    remoteStreamPresent:
      input.remoteStreamPresent ?? alive.remoteStreamPresent ?? false,
    localAudioTracks: input.localAudioTracks ?? alive.localAudioTracks ?? 0,
    remoteAudioTracks: input.remoteAudioTracks ?? alive.remoteAudioTracks ?? 0,
    localVideoTracks: input.localVideoTracks ?? alive.localVideoTracks ?? 0,
    remoteVideoTracks: input.remoteVideoTracks ?? alive.remoteVideoTracks ?? 0,
    exitSource: input.exitSource ?? null,
    reason: input.reason ?? null,
    engine: input.engine ?? alive.engine ?? null,
    callId: input.callId ?? alive.callId ?? null,
    mediaAlive: alive.alive,
  };
}

export function logCallUiState(input: CallUiStateLogInput): void {
  const payload = buildCallUiStatePayload(input);
  console.error('[CALL_UI_STATE]', JSON.stringify(payload));
  logAfwCall('call_ui_state', payload);
}

export function logWhyCallInterrupted(input: WhyCallInterruptedInput): void {
  const alive = peekCallMediaAliveSnapshot();
  const payload: Record<string, unknown> = {
    reason: input.reason,
    exitSource: input.exitSource ?? null,
    callState: input.callState ?? alive.callState ?? null,
    connectionState: input.connectionState ?? alive.connectionState ?? null,
    iceConnectionState: input.iceConnectionState ?? alive.iceConnectionState ?? null,
    mediaAlive: shouldSuppressCallInterruptedUi(),
    mediaAliveSnapshot: alive.alive,
    engine: alive.engine ?? null,
    callId: alive.callId ?? null,
    fileHint: input.fileHint ?? null,
    componentStack: String(input.componentStack ?? '').slice(0, 2000),
    ...serializeError(input.error),
  };
  console.error('[WHY_CALL_INTERRUPTED]', JSON.stringify(payload));
  logAfwCall('why_call_interrupted', payload);
}

export function snapshotFromMediaAlive(alive: CallMediaAliveSnapshot): CallUiStateLogInput {
  return {
    phase: 'media_alive_snapshot',
    callState: alive.callState,
    connectionState: alive.connectionState,
    iceConnectionState: alive.iceConnectionState,
    signalingState: alive.signalingState,
    localStreamPresent: alive.localStreamPresent,
    remoteStreamPresent: alive.remoteStreamPresent,
    localAudioTracks: alive.localAudioTracks,
    remoteAudioTracks: alive.remoteAudioTracks,
    localVideoTracks: alive.localVideoTracks,
    remoteVideoTracks: alive.remoteVideoTracks,
    engine: alive.engine,
    callId: alive.callId,
  };
}
