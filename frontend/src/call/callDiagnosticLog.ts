/**
 * Logs permanents appels WebRTC — toujours visibles Logcat / Metro (console.error).
 * Indépendants de EXPO_PUBLIC_CALL_DEBUG et de __DEV__.
 *
 * Tags : [AFW_CALL] [SDP_SEND] [SDP_RECEIVED] [ICE_LOCAL] [ICE_REMOTE]
 *        [CALL_END_EMIT] [CALL_END_RECEIVED]  (+ [AFW_CALL_EXIT] dans callCallExit.ts)
 */

export type CallDiagnosticSdpSummary = {
  type: string | null;
  sdpLen: number;
  hasAudio: boolean;
  hasVideo: boolean;
};

export function summarizeCallSdp(
  sdp: string | undefined,
  type?: string | null,
): CallDiagnosticSdpSummary {
  const body = String(sdp || '');
  return {
    type: type ? String(type) : null,
    sdpLen: body.length,
    hasAudio: body.includes('m=audio'),
    hasVideo: body.includes('m=video'),
  };
}

function serialize(meta?: Record<string, unknown>): string {
  return JSON.stringify({ ts: Date.now(), ...meta });
}

/** Événements cycle d'appel (invite, accept, createOffer, bootstrap, abort…). */
export function logAfwCall(phase: string, meta?: Record<string, unknown>): void {
  console.error('[AFW_CALL]', phase, serialize(meta));
}

export function logSdpSend(meta: Record<string, unknown>): void {
  console.error('[SDP_SEND]', serialize(meta));
}

export function logSdpReceived(meta: Record<string, unknown>): void {
  console.error('[SDP_RECEIVED]', serialize(meta));
}

export function logIceLocal(meta: Record<string, unknown>): void {
  console.error('[ICE_LOCAL]', serialize(meta));
}

export function logIceRemote(meta: Record<string, unknown>): void {
  console.error('[ICE_REMOTE]', serialize(meta));
}

export function logCallEndEmit(meta: Record<string, unknown>): void {
  console.error('[CALL_END_EMIT]', serialize(meta));
}

export function logCallEndReceived(meta: Record<string, unknown>): void {
  console.error('[CALL_END_RECEIVED]', serialize(meta));
}

export function logSetLocalDescription(meta: Record<string, unknown>): void {
  logAfwCall('setLocalDescription', meta);
}

export function logSetRemoteDescription(meta: Record<string, unknown>): void {
  logAfwCall('setRemoteDescription', meta);
}

export function logCreateOffer(meta: Record<string, unknown>): void {
  logAfwCall('createOffer', meta);
}

/** Piste distante reçue (ontrack / sync receivers). */
export function logRemoteTrackReceived(meta: Record<string, unknown>): void {
  console.error('[REMOTE_TRACK_RECEIVED]', serialize(meta));
}

/** MediaStream distant reconstruit ou mis à jour avant RTCView natif. */
export function logRemoteStreamReceived(meta: Record<string, unknown>): void {
  console.error('[REMOTE_STREAM_RECEIVED]', serialize(meta));
}

/** RTCView natif — bind ignoré (URL locale, should_bind, etc.). */
export function logRemoteRtcBindSkipped(meta: Record<string, unknown>): void {
  console.error('[REMOTE_RTC_BIND_SKIPPED]', serialize(meta));
}

/** Audit senders/receivers/transceivers — preuve réception média. */
export function logRemoteMediaAudit(meta: Record<string, unknown>): void {
  console.error('[REMOTE_MEDIA_AUDIT]', serialize(meta));
}

/** Paire ICE sélectionnée (host/srflx/relay). */
export function logIceSelectedCandidate(meta: Record<string, unknown>): void {
  console.error('[ICE_SELECTED]', serialize(meta));
}

/** RTP entrant/sortant par kind — preuve média réel (packets, bytes, framesDecoded). */
export function logRtpMediaStats(meta: Record<string, unknown>): void {
  console.error('[RTP_MEDIA_STATS]', serialize(meta));
}

/** État senders/transceivers juste avant createOffer (debug mid=0 Android). */
export function logPreCreateOfferPeerConnection(meta: Record<string, unknown>): void {
  logAfwCall('pre_create_offer', meta);
}

type DebugTransceiverRow = {
  mid: string | null;
  direction: string | null;
  currentDirection: string | null;
  senderTrack: string | null;
  receiverTrack: string | null;
};

/** Marqueur livraison — si absent Logcat, l’APK n’exécute pas le JS Metro courant. */
export function logPatchAudioFixActive(meta: Record<string, unknown>): void {
  const payload = JSON.stringify({
    tag: 'PATCH_AUDIO_FIX_ACTIVE',
    ts: Date.now(),
    ...meta,
  });
  console.error('[PATCH_AUDIO_FIX_ACTIVE]', payload);
  /** Même filtre logcat que les phases [Call] (ReactNativeJS:W). */
  console.warn('[Call]', payload);
}

/** Logcat : état PC immédiatement avant setLocalDescription(offer). */
export function logDebugTransceiversBeforeSetLocal(
  pc: RTCPeerConnection | null | undefined,
  meta?: Record<string, unknown>,
): void {
  const transceivers: DebugTransceiverRow[] = (pc?.getTransceivers?.() ?? []).map((t) => ({
    mid: t.mid ?? null,
    direction: t.direction ?? null,
    currentDirection: t.currentDirection ?? null,
    senderTrack: t.sender?.track?.kind ?? null,
    receiverTrack: t.receiver?.track?.kind ?? null,
  }));
  const senders = (pc?.getSenders?.() ?? []).map((s) => ({
    kind: s.track?.kind ?? null,
    id: s.track?.id ?? null,
  }));
  const body = JSON.stringify({ ts: Date.now(), ...meta, transceivers, senders });
  console.error('[DEBUG_TRANSCEIVERS]', body);
  console.error('[DEBUG_SENDERS]', JSON.stringify({ ts: Date.now(), ...meta, senders }));
  console.warn('[Call]', JSON.stringify({ tag: 'DEBUG_TRANSCEIVERS', ...meta, transceivers, senders }));
  logAfwCall('debug_before_set_local', { ...meta, transceivers, senders });
}

export function logCreateAnswer(meta: Record<string, unknown>): void {
  logAfwCall('createAnswer', meta);
}
