import { VOICE_OPUS_BITRATE_DEFAULT } from './callNetworkConfig';

/** Profil vocal VoIP — proche messageries (Opus mono, FEC, faible latence). */

export const VOICE_OPUS_MAX_AVERAGE_BITRATE = VOICE_OPUS_BITRATE_DEFAULT;
export const VOICE_OPUS_MAX_PLAYBACK_RATE = 48_000;
/** Tampon de lecture cible (s) — équilibre fluidité / latence. */
export const VOICE_JITTER_BUFFER_TARGET_SEC = 0.04;

export function tuneVoiceCallSdp(
  sdp: string | undefined,
  maxBitrate = VOICE_OPUS_MAX_AVERAGE_BITRATE,
): string | undefined {
  if (!sdp) return sdp;

  const opusMap = sdp.match(/a=rtpmap:(\d+) opus\/48000(?:\/\d+)?/i);
  if (!opusMap) return sdp;

  const payloadType = opusMap[1];
  let out = sdp.replace(
    new RegExp(`a=rtpmap:${payloadType} opus/48000(?:/\\d+)?`, 'i'),
    `a=rtpmap:${payloadType} opus/48000/1`,
  );

  const fmtp = [
    'minptime=10',
    'useinbandfec=1',
    'usedtx=0',
    'stereo=0',
    `maxaveragebitrate=${maxBitrate}`,
    `maxplaybackrate=${VOICE_OPUS_MAX_PLAYBACK_RATE}`,
  ].join(';');

  const fmtpLine = `a=fmtp:${payloadType} ${fmtp}`;
  const fmtpRe = new RegExp(`a=fmtp:${payloadType} [^\r\n]+`, 'g');
  if (fmtpRe.test(out)) {
    out = out.replace(fmtpRe, fmtpLine);
  } else {
    out = out.replace(
      new RegExp(`(a=rtpmap:${payloadType} opus/48000/1\r\\n)`, 'i'),
      `$1${fmtpLine}\r\n`,
    );
  }

  return out;
}

export function withTunedVoiceSdp<T extends { type: RTCSdpType; sdp?: string }>(
  desc: T,
  maxBitrate = VOICE_OPUS_MAX_AVERAGE_BITRATE,
): T {
  return {
    ...desc,
    sdp: tuneVoiceCallSdp(desc.sdp, maxBitrate) ?? desc.sdp,
  };
}

/**
 * Natif (react-native-webrtc) : ne pas retoucher le SDP avant setLocalDescription.
 * Sinon Android échoue sur :
 * « Failed to set local audio description recv parameters for m-section with mid='0' »
 * Le bitrate vocal passe par `applyVoiceAudioSenderParameters` après négociation.
 */
export function shouldTuneSdpBeforeSetLocalDescription(isWebRuntime: boolean): boolean {
  return isWebRuntime;
}

/**
 * Natif : `setParameters` sur l’expéditeur avant le 1er `setLocalDescription` peut faire échouer
 * Android avec « recv parameters for m-section with mid='0' ». Appliquer le bitrate après SDP.
 */
export function shouldOptimizeCallAudioBeforeFirstNegotiation(isWebRuntime: boolean): boolean {
  return isWebRuntime;
}

export type NativeSessionDescriptionCtor = new (
  descriptionInitDict: RTCSessionDescriptionInit,
) => RTCSessionDescription;

export async function setTunedLocalDescription(
  pc: RTCPeerConnection,
  desc: RTCSessionDescriptionInit,
  maxBitrate = VOICE_OPUS_MAX_AVERAGE_BITRATE,
  isWebRuntime = false,
  nativeSessionDescriptionImpl?: NativeSessionDescriptionCtor,
): Promise<void> {
  const payload = shouldTuneSdpBeforeSetLocalDescription(isWebRuntime)
    ? withTunedVoiceSdp(desc, maxBitrate)
    : desc;
  if (!isWebRuntime && nativeSessionDescriptionImpl) {
    await pc.setLocalDescription(new nativeSessionDescriptionImpl(payload));
    return;
  }
  await pc.setLocalDescription(payload);
}

export async function applyVoiceAudioSenderParameters(
  pc: RTCPeerConnection,
  maxBitrate = VOICE_OPUS_MAX_AVERAGE_BITRATE,
): Promise<void> {
  const senders = pc.getSenders?.() ?? [];
  for (const sender of senders) {
    if (sender.track?.kind !== 'audio') continue;
    try {
      const params = sender.getParameters?.() ?? { encodings: [{}] };
      const encodings = params.encodings?.length ? params.encodings : [{}];
      params.encodings = encodings.map((enc) => ({
        ...enc,
        maxBitrate,
        priority: 'high' as RTCPriorityType,
        networkPriority: 'high' as RTCPriorityType,
      }));
      await sender.setParameters?.(params);
    } catch {
      /* best-effort */
    }
  }
}

export function applyVoiceAudioReceiverJitterTarget(pc: RTCPeerConnection): void {
  for (const receiver of pc.getReceivers?.() ?? []) {
    if (receiver.track?.kind !== 'audio') continue;
    try {
      const rx = receiver as RTCRtpReceiver & { jitterBufferTarget?: number };
      if ('jitterBufferTarget' in rx) {
        rx.jitterBufferTarget = VOICE_JITTER_BUFFER_TARGET_SEC;
      }
    } catch {
      /* API non supportée (vieux navigateurs) */
    }
  }
}

type MinimalTransceiver = {
  stop?: () => void;
  currentDirection?: RTCRtpTransceiverDirection | null;
  direction?: RTCRtpTransceiverDirection;
  sender?: { track?: { kind?: string } | null } | null;
  receiver?: { track?: { kind?: string } | null } | null;
};

function transceiverKind(t: MinimalTransceiver): string {
  return String(t.sender?.track?.kind || t.receiver?.track?.kind || '');
}

function transceiverIsSending(t: MinimalTransceiver): boolean {
  return Boolean(t.sender?.track);
}

/**
 * Choisit les transceivers à neutraliser pour éviter une section média en
 * doublon (`mid='0'` / `mid='1'`). On garde, par type, le premier transceiver
 * qui ENVOIE notre média ; on neutralise les autres du même type (2e émetteur
 * addTrack ou recvonly/inactive en trop).
 *
 * Pur et testable : ne touche pas au PeerConnection.
 */
export function selectRedundantTransceivers<T extends MinimalTransceiver>(transceivers: T[]): T[] {
  const keptSenderByKind = new Set<string>();
  const redundant: T[] = [];
  for (const t of transceivers) {
    const kind = transceiverKind(t);
    if (kind !== 'audio' && kind !== 'video') continue;
    if (transceiverIsSending(t)) {
      if (keptSenderByKind.has(kind)) {
        redundant.push(t);
        continue;
      }
      keptSenderByKind.add(kind);
      continue;
    }
    // Transceiver sans piste émise : candidat au doublon SI un émetteur du même type existe.
    redundant.push(t);
  }
  // Ne neutraliser un transceiver « sans envoi » que si un émetteur du même type est gardé.
  return redundant.filter((t) => keptSenderByKind.has(transceiverKind(t)));
}

/**
 * Neutralise les transceivers en doublon (sans envoi) avant createOffer/createAnswer.
 * Empêche la 2e section audio (`mid='1'`) qui bloque l’appelant.
 */
export function pruneRedundantCallTransceivers(pc: RTCPeerConnection | null): number {
  if (!pc?.getTransceivers) return 0;
  let stopped = 0;
  try {
    const all = pc.getTransceivers() as unknown as MinimalTransceiver[];
    for (const t of selectRedundantTransceivers(all)) {
      try {
        t.stop?.();
        stopped += 1;
      } catch {
        /* stop() non supporté — best-effort */
      }
    }
  } catch {
    /* getTransceivers absent — best-effort */
  }
  return stopped;
}

/** Applique réglages expéditeur + tampon réception après négociation. */
export async function optimizeCallAudioPipeline(
  pc: RTCPeerConnection | null,
  maxBitrate = VOICE_OPUS_MAX_AVERAGE_BITRATE,
): Promise<void> {
  if (!pc) return;
  await applyVoiceAudioSenderParameters(pc, maxBitrate);
  applyVoiceAudioReceiverJitterTarget(pc);
}
