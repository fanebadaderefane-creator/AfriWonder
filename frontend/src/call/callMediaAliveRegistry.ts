/**
 * Registre UI — le média est-il encore vivant malgré une erreur React ?
 * Ne touche pas Agora/WebRTC : lit uniquement des snapshots posés par l’écran d’appel.
 */

import { peekAgoraDmActiveChannelCallId } from './agoraDmActiveChannel';
import { isIceConnectionReady } from './callRemoteMedia';
import {
  safeAudioTrackCount,
  safeVideoTrackCount,
  type NullableMediaStreamLike,
} from './callStreamTracks';

export type CallMediaAliveSnapshot = {
  engine: 'webrtc' | 'agora' | null;
  alive: boolean;
  callId?: string | null;
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
};

let snapshot: CallMediaAliveSnapshot = { engine: null, alive: false };

function trackCounts(stream: NullableMediaStreamLike | null | undefined) {
  return {
    audio: safeAudioTrackCount(stream),
    video: safeVideoTrackCount(stream),
  };
}

export function peekCallMediaAliveSnapshot(): CallMediaAliveSnapshot {
  return { ...snapshot };
}

export function clearCallMediaAlive(engine?: 'webrtc' | 'agora'): void {
  if (engine && snapshot.engine !== engine) return;
  snapshot = { engine: null, alive: false };
}

export function syncAgoraCallMediaAlive(input: {
  callId: string;
  alive: boolean;
  callState?: string | null;
}): void {
  snapshot = {
    engine: 'agora',
    alive: input.alive,
    callId: input.callId,
    callState: input.callState ?? null,
  };
}

export function syncWebRtcCallMediaAlive(input: {
  callId?: string | null;
  callState?: string | null;
  connectionState?: string | null;
  iceConnectionState?: string | null;
  signalingState?: string | null;
  localStream?: NullableMediaStreamLike | null;
  remoteStream?: NullableMediaStreamLike | null;
}): void {
  const localCounts = trackCounts(input.localStream);
  const remoteCounts = trackCounts(input.remoteStream);
  const connectionState = String(input.connectionState || '');
  const ice = String(input.iceConnectionState || '');
  const callState = String(input.callState || '');
  const alive =
    callState === 'connected' ||
    callState === 'connecting' ||
    connectionState === 'connected' ||
    connectionState === 'connecting' ||
    isIceConnectionReady(ice);

  snapshot = {
    engine: 'webrtc',
    alive,
    callId: input.callId ?? null,
    callState: input.callState ?? null,
    connectionState: input.connectionState ?? null,
    iceConnectionState: input.iceConnectionState ?? null,
    signalingState: input.signalingState ?? null,
    localStreamPresent: Boolean(input.localStream),
    remoteStreamPresent: Boolean(input.remoteStream),
    localAudioTracks: localCounts.audio,
    remoteAudioTracks: remoteCounts.audio,
    localVideoTracks: localCounts.video,
    remoteVideoTracks: remoteCounts.video,
  };
}

/** Ne pas afficher « Appel interrompu » tant que le média est encore actif. */
export function shouldSuppressCallInterruptedUi(): boolean {
  if (peekAgoraDmActiveChannelCallId()) return true;
  const s = snapshot;
  if (!s.alive) return false;
  if (s.engine === 'agora') return true;
  const cs = String(s.connectionState || '');
  if (cs === 'connected' || cs === 'connecting') return true;
  if (isIceConnectionReady(s.iceConnectionState)) return true;
  if (s.callState === 'connected' || s.callState === 'connecting') return true;
  return false;
}

export function isWebRtcMediaStillConnected(input: {
  connectionState?: string | null;
  iceConnectionState?: string | null;
  callState?: string | null;
}): boolean {
  const cs = String(input.connectionState || '');
  if (cs === 'connected' || cs === 'connecting') return true;
  if (isIceConnectionReady(input.iceConnectionState)) return true;
  const callState = String(input.callState || '');
  return callState === 'connected' || callState === 'connecting';
}
