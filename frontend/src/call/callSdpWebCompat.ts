/**
 * Unified Plan browsers (Chrome, Safari, Firefox) reject legacy Plan-B
 * a=ssrc:<id> msid:<stream> <track> lines that react-native-webrtc still emits.
 *
 * Also fixes RN WebRTC answers that break setRemoteDescription on web:
 * - `a=ssrc:* cname:{uuid}` (Chrome: Invalid SDP line)
 * - duplicate `m=audio` sections (`mid='1'`) when offer only negotiated one audio m-line
 */

export type SdpMediaKind = 'audio' | 'video';

type ParsedSdp = {
  eol: string;
  sessionLines: string[];
  mediaSections: Array<{ kind: string; lines: string[] }>;
};

function detectSdpEol(sdp: string): string {
  return sdp.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * RFC 4566 — chaque ligne SDP doit se terminer par CRLF (`\r\n`).
 * Le parseur natif (react-native-webrtc / APK) et le tuning web (`sdpTuned`) peuvent
 * produire des `\n` seuls → décalage du parseur → « Invalid SDP line » sur `a=ssrc:`.
 */
export function normalizeSdpCrLf(sdp: string, options?: { trailingCrlf?: boolean }): string {
  const raw = String(sdp || '').trim();
  if (!raw) return '';
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) return '';
  const joined = lines.join('\r\n');
  if (options?.trailingCrlf === false) return joined;
  return `${joined}\r\n`;
}

function parseSdpSections(sdp: string): ParsedSdp {
  const eol = detectSdpEol(sdp);
  const sessionLines: string[] = [];
  const mediaSections: Array<{ kind: string; lines: string[] }> = [];
  let current: { kind: string; lines: string[] } | null = null;

  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith('m=')) {
      if (current) mediaSections.push(current);
      current = { kind: line.slice(2).split(/\s/)[0] || '', lines: [line] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      sessionLines.push(line);
    }
  }
  if (current) mediaSections.push(current);

  return { eol, sessionLines, mediaSections };
}

function joinSdpSections(parsed: ParsedSdp): string {
  const body = [
    ...parsed.sessionLines,
    ...parsed.mediaSections.flatMap((section) => section.lines),
  ];
  while (body.length > 0 && body[body.length - 1] === '') {
    body.pop();
  }
  return body.join(parsed.eol);
}

function countMediaSections(parsed: ParsedSdp, kind: SdpMediaKind): number {
  return parsed.mediaSections.filter((section) => section.kind === kind).length;
}

export function stripLegacySsrcMsidLines(sdp: string): string {
  if (!sdp || !sdp.includes('a=ssrc:') || !sdp.includes(' msid:')) {
    return sdp;
  }
  const eol = detectSdpEol(sdp);
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc:\S+\s+msid:/i.test(line))
    .join(eol);
}

/**
 * Unified Plan (Chrome / Firefox / Safari) : les lignes `a=ssrc` / `a=ssrc-group`
 * héritées Plan-B cassent `setRemoteDescription` (« Invalid SDP line ») même avec
 * un `cname:` valide. Les flux sont corrélés via `a=msid` sur chaque `m=`.
 */
export function stripAllSsrcAttributeLines(sdp: string): string {
  if (!sdp || !sdp.includes('a=ssrc')) {
    return sdp;
  }
  const eol = detectSdpEol(sdp);
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc-group:/i.test(line) && !/^a=ssrc:/i.test(line))
    .join(eol);
}

/**
 * @deprecated Préférer `stripAllSsrcAttributeLines` — Chrome rejette aussi les cname valides.
 */
export function fixInvalidSsrcCnameLines(sdp: string): string {
  return stripAllSsrcAttributeLines(sdp);
}

/**
 * Keeps the first `m=audio` / `m=video` section; drops extras from RN duplicate transceivers.
 * Prevents caller-side « send parameters for m-section with mid='1' » on setRemoteDescription(answer).
 */
export function collapseDuplicateSdpMediaSections(sdp: string, kind: SdpMediaKind): string {
  if (!sdp) return sdp;
  const parsed = parseSdpSections(sdp);
  if (countMediaSections(parsed, kind) <= 1) return sdp;

  let seen = 0;
  parsed.mediaSections = parsed.mediaSections.filter((section) => {
    if (section.kind !== kind) return true;
    seen += 1;
    return seen === 1;
  });
  return joinSdpSections(parsed);
}

/** Sanitize inbound remote SDP before RTCPeerConnection.setRemoteDescription. */
export function sanitizeInboundSdpForWebRtc(sdp: string): string {
  let out = stripAllSsrcAttributeLines(sdp);
  out = stripLegacySsrcMsidLines(out);
  out = collapseDuplicateSdpMediaSections(out, 'audio');
  out = collapseDuplicateSdpMediaSections(out, 'video');
  return normalizeSdpCrLf(out);
}
