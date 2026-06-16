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
 * react-native-webrtc sometimes emits `cname:{uuid}` — Chrome rejects the braces.
 */
export function fixInvalidSsrcCnameLines(sdp: string): string {
  if (!sdp || !/cname:\{/i.test(sdp)) {
    return sdp;
  }
  const eol = detectSdpEol(sdp);
  return sdp
    .split(/\r?\n/)
    .map((line) => {
      if (!/^a=ssrc:\S+\s+cname:/i.test(line)) return line;
      return line.replace(/cname:\{([^}]+)\}/gi, 'cname:$1');
    })
    .join(eol);
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
  let out = stripLegacySsrcMsidLines(sdp);
  out = fixInvalidSsrcCnameLines(out);
  out = collapseDuplicateSdpMediaSections(out, 'audio');
  out = collapseDuplicateSdpMediaSections(out, 'video');
  return out;
}
