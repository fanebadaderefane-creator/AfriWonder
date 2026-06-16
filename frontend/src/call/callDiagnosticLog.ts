/**
 * Logs permanents appels WebRTC — toujours visibles Logcat / Metro (console.error).
 * Indépendants de EXPO_PUBLIC_CALL_DEBUG et de __DEV__.
 *
 * Tags : [AFW_CALL] [SDP_SEND] [SDP_RECEIVED] [ICE_LOCAL] [ICE_REMOTE] [ICE_REMOTE_APPLIED]
 *        [ICE_QUEUED] [ICE_FLUSH_PENDING] [PC_STATES] [CALL_END_EMIT] [CALL_END_RECEIVED]
 *        [ANSWER_SEND_START] [ANSWER_SEND_SUCCESS] [ANSWER_SEND_ERROR]
 *        [ANSWER_RX] [SET_REMOTE_ANSWER_START] [SET_REMOTE_ANSWER_SUCCESS] [SET_REMOTE_ANSWER_ERROR]
 *        (+ [AFW_CALL_EXIT] dans callCallExit.ts)
 */

import { sdpCandidateCounts } from './callIceGathering';

export type CallDiagnosticSdpSummary = {
  type: string | null;
  sdpLen: number;
  hasAudio: boolean;
  hasVideo: boolean;
  /** Candidats ICE embarqués dans le SDP (lignes a=candidate:). */
  iceHost: number;
  iceSrflx: number;
  iceRelay: number;
  iceTotal: number;
};

export function summarizeCallSdp(
  sdp: string | undefined,
  type?: string | null,
): CallDiagnosticSdpSummary {
  const body = String(sdp || '');
  const ice = sdpCandidateCounts(body);
  return {
    type: type ? String(type) : null,
    sdpLen: body.length,
    hasAudio: body.includes('m=audio'),
    hasVideo: body.includes('m=video'),
    iceHost: ice.host,
    iceSrflx: ice.srflx,
    iceRelay: ice.relay,
    iceTotal: ice.total,
  };
}

function serialize(meta?: Record<string, unknown>): string {
  return JSON.stringify({ ts: Date.now(), ...meta });
}

/**
 * Extrait le type (`host`/`srflx`/`relay`/`prflx`) et le protocole (`udp`/`tcp`)
 * d'une chaîne de candidat ICE. `react-native-webrtc` n'expose PAS `candidate.type`
 * comme propriété ; l'info est uniquement dans la chaîne SDP brute :
 *   `candidate:<foundation> <component> <proto> <prio> <ip> <port> typ <type> …`
 * Indispensable pour prouver que des candidats `relay` (TURN) sont bien générés /
 * échangés (cause racine probable « checking → jamais connected » Maroc↔Mali).
 */
export function parseIceCandidateMeta(candidate?: string | null): {
  type: string | null;
  protocol: string | null;
} {
  const raw = String(candidate || '');
  if (!raw) return { type: null, protocol: null };
  const typeMatch = raw.match(/\btyp\s+(host|srflx|prflx|relay)\b/i);
  const parts = raw.replace(/^candidate:/, '').trim().split(/\s+/);
  const protocol = parts.length >= 3 ? String(parts[2]).toLowerCase() : null;
  return {
    type: typeMatch ? typeMatch[1].toLowerCase() : null,
    protocol: protocol === 'udp' || protocol === 'tcp' ? protocol : null,
  };
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

/** Preuve : addIceCandidate() a réussi côté receveur/appelant. */
export function logIceRemoteApplied(meta: Record<string, unknown>): void {
  console.error('[ICE_REMOTE_APPLIED]', serialize(meta));
}

/** Candidat ICE reçu avant setRemoteDescription — mis en file pendingIceRef. */
export function logIceQueued(meta: Record<string, unknown>): void {
  console.error('[ICE_QUEUED]', serialize(meta));
}

/** Vidage de pendingIceRef après setRemoteDescription(offer|answer). */
export function logIceFlushPending(meta: Record<string, unknown>): void {
  console.error('[ICE_FLUSH_PENDING]', serialize(meta));
}

/** États PeerConnection — corrélation ICE/DTLS (Maroc↔Mali). */
export function logPeerConnectionStates(meta: Record<string, unknown>): void {
  console.error('[PC_STATES]', serialize(meta));
}

export function readPeerConnectionStates(pc: RTCPeerConnection | null | undefined): Record<string, string | null> {
  if (!pc) {
    return {
      iceConnectionState: null,
      connectionState: null,
      signalingState: null,
      iceGatheringState: null,
    };
  }
  return {
    iceConnectionState: String(pc.iceConnectionState || '') || null,
    connectionState: String(pc.connectionState || '') || null,
    signalingState: String(pc.signalingState || '') || null,
    iceGatheringState: String(pc.iceGatheringState || '') || null,
  };
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

/**
 * État transport DTLS/ICE — preuve « connecté mais aucun média ».
 * dtlsState != 'connected' ⇒ pas de SRTP ⇒ 0 packet audio ET vidéo.
 */
export function logCallTransportStats(meta: Record<string, unknown>): void {
  console.error('[CALL_TRANSPORT_STATS]', serialize(meta));
}

/**
 * Verdict média consolidé (cause racine en UNE ligne).
 * Ex. Maroc↔Mali « connecté mais personne n'entend personne » → on lit
 * directement `inbound_dead` / `silent_both` / `dtls_not_connected` sans
 * corréler ICE + RTP + transport à la main.
 */
export function logCallMediaVerdict(meta: Record<string, unknown>): void {
  console.error('[CALL_MEDIA_VERDICT]', serialize(meta));
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

/** Receveur — début envoi answer SDP (avant half-trickle / socket). */
export function logAnswerSendStart(meta: Record<string, unknown>): void {
  console.error('[ANSWER_SEND_START]', serialize(meta));
}

/** Receveur — answer SDP émise via socket avec succès. */
export function logAnswerSendSuccess(meta: Record<string, unknown>): void {
  console.error('[ANSWER_SEND_SUCCESS]', serialize(meta));
}

/** Receveur — échec création ou envoi answer SDP. */
export function logAnswerSendError(meta: Record<string, unknown>): void {
  console.error('[ANSWER_SEND_ERROR]', serialize(meta));
}

/** Appelant — signal answer reçu (avant setRemoteDescription). */
export function logAnswerRx(meta: Record<string, unknown>): void {
  console.error('[ANSWER_RX]', serialize(meta));
}

export function logSetRemoteAnswerStart(meta: Record<string, unknown>): void {
  console.error('[SET_REMOTE_ANSWER_START]', serialize(meta));
}

export function logSetRemoteAnswerSuccess(meta: Record<string, unknown>): void {
  console.error('[SET_REMOTE_ANSWER_SUCCESS]', serialize(meta));
}

export function logSetRemoteAnswerError(meta: Record<string, unknown>): void {
  console.error('[SET_REMOTE_ANSWER_ERROR]', serialize(meta));
}
