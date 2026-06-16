/**
 * Half-trickle ICE — injection des candidats locaux DANS le SDP sortant.
 *
 * Sur Android/iOS (`react-native-webrtc`), `pc.localDescription.sdp` reste souvent
 * SANS lignes `a=candidate:` : les candidats arrivent uniquement via `onicecandidate`.
 * Attendre un `relay` dans `localDescription.sdp` (callIceGathering) time-out donc
 * à vide → offer/answer « nus » → receveur sans ICE distant → DTLS `new` (Maroc↔Mali).
 *
 * Module PUR — testable sans WebRTC.
 */

import { parseIceCandidateMeta } from './callDiagnosticLog';
import {
  type SdpCandidateCounts,
  sdpCandidateCounts,
  type IceGatheringWaitDecision,
  type IceGatheringWaitInput,
  decideIceGatheringWaitFromCounts,
} from './callIceGathering';

export type IceCandidateInitLite = {
  candidate?: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

const EMPTY_COUNTS: SdpCandidateCounts = {
  host: 0,
  srflx: 0,
  relay: 0,
  prflx: 0,
  total: 0,
};

/** Compte host/srflx/relay depuis les chaînes `onicecandidate` (pas le SDP PC). */
export function iceCandidateInitCounts(
  candidates: ReadonlyArray<IceCandidateInitLite> | null | undefined,
): SdpCandidateCounts {
  const counts: SdpCandidateCounts = { ...EMPTY_COUNTS };
  for (const c of candidates ?? []) {
    const { type } = parseIceCandidateMeta(c.candidate ?? null);
    if (type === 'host' || type === 'srflx' || type === 'relay' || type === 'prflx') {
      counts[type] += 1;
      counts.total += 1;
    }
  }
  return counts;
}

export function mergeSdpCandidateCounts(
  a: SdpCandidateCounts,
  b: SdpCandidateCounts,
): SdpCandidateCounts {
  return {
    host: a.host + b.host,
    srflx: a.srflx + b.srflx,
    relay: a.relay + b.relay,
    prflx: a.prflx + b.prflx,
    total: a.total + b.total,
  };
}

function candidateToSdpLine(candidate: IceCandidateInitLite): string | null {
  const raw = String(candidate.candidate || '').trim();
  if (!raw) return null;
  if (raw.startsWith('a=')) return raw;
  if (raw.startsWith('candidate:')) return `a=${raw}`;
  return `a=candidate:${raw}`;
}

/**
 * Embarque les candidats trickle dans le SDP avant émission socket fiable.
 * Déduplique par ligne `a=candidate:…`.
 */
export function embedIceCandidatesInSdp(
  sdp: string,
  candidates: ReadonlyArray<IceCandidateInitLite>,
): string {
  const body = String(sdp || '').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n').trimEnd();
  if (!body || !candidates.length) return body;

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const c of candidates) {
    const line = candidateToSdpLine(c);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  if (!lines.length) return body;
  return `${body}\r\n${lines.join('\r\n')}\r\n`;
}

export type IceGatheringWaitWithBufferInput = IceGatheringWaitInput & {
  /** Candidats `onicecandidate` (Android/iOS — souvent absents du SDP PC). */
  gatheredCandidates?: ReadonlyArray<IceCandidateInitLite>;
};

/**
 * Comme `decideIceGatheringWait`, mais compte aussi le buffer `onicecandidate`.
 */
export function decideIceGatheringWaitWithBuffer(
  input: IceGatheringWaitWithBufferInput,
): IceGatheringWaitDecision {
  const fromSdp = sdpCandidateCounts(input.sdp);
  const fromGathered = iceCandidateInitCounts(input.gatheredCandidates);
  const merged = mergeSdpCandidateCounts(fromSdp, fromGathered);
  return decideIceGatheringWaitFromCounts(input, merged);
}

/** SDP sortant = description locale + candidats buffer (half-trickle Maroc↔Mali). */
/**
 * Half-trickle avant émission : offer (+ pranswer / rollback) ; answer natif+TURN aussi.
 */
export function shouldAwaitIceBeforeOutboundSdp(
  sdpType: string | null | undefined,
  options?: { turnConfigured?: boolean; isNative?: boolean },
): boolean {
  const t = String(sdpType || '').trim().toLowerCase();
  if (t === 'offer' || t === 'pranswer' || t === 'rollback') return true;
  if (t === 'answer' && options?.turnConfigured && options?.isNative) return true;
  return false;
}

/** Answer web / sans TURN : micro-attente ICE (≤450 ms). */
export function shouldAwaitMinimalIceBeforeAnswerEmbed(
  sdpType: string | null | undefined,
  options?: { turnConfigured?: boolean; isNative?: boolean },
): boolean {
  if (String(sdpType || '').trim().toLowerCase() !== 'answer') return false;
  if (options?.turnConfigured && options?.isNative) return false;
  return true;
}

export function minimalIceGatherReady(
  gatheredCount: number,
  iceGatheringState?: string | null,
): boolean {
  if (gatheredCount > 0) return true;
  return String(iceGatheringState || '').toLowerCase() === 'complete';
}

export const MINIMAL_ANSWER_ICE_WAIT_MS = 450;
export const MINIMAL_ANSWER_ICE_POLL_MS = 50;

export function buildOutboundSdpWithEmbeddedIce(input: {
  sdp: string;
  type: string;
  gatheredCandidates: ReadonlyArray<IceCandidateInitLite>;
}): { type: string; sdp: string; embeddedCount: number; counts: SdpCandidateCounts } {
  const embedded = embedIceCandidatesInSdp(input.sdp, input.gatheredCandidates);
  const before = sdpCandidateCounts(input.sdp);
  const after = sdpCandidateCounts(embedded);
  return {
    type: input.type,
    sdp: embedded,
    embeddedCount: Math.max(0, after.total - before.total),
    counts: after,
  };
}
