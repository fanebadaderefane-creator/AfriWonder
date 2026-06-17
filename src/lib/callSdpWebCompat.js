/**
 * Unified Plan browsers reject legacy Plan-B a=ssrc msid lines from react-native-webrtc.
 * Parité PWA avec frontend/src/call/callSdpWebCompat.ts
 */

function detectSdpEol(sdp) {
  return sdp.includes('\r\n') ? '\r\n' : '\n';
}

/** RFC 4566 — CRLF obligatoire pour parseurs natifs (APK) et web. */
export function normalizeSdpCrLf(sdp, options) {
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

function parseSdpSections(sdp) {
  const eol = detectSdpEol(sdp);
  const sessionLines = [];
  const mediaSections = [];
  let current = null;

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

function joinSdpSections(parsed) {
  const body = [
    ...parsed.sessionLines,
    ...parsed.mediaSections.flatMap((section) => section.lines),
  ];
  while (body.length > 0 && body[body.length - 1] === '') {
    body.pop();
  }
  return body.join(parsed.eol);
}

function countMediaSections(parsed, kind) {
  return parsed.mediaSections.filter((section) => section.kind === kind).length;
}

export function stripLegacySsrcMsidLines(sdp) {
  if (!sdp || !sdp.includes('a=ssrc:') || !sdp.includes(' msid:')) {
    return sdp;
  }
  const eol = detectSdpEol(sdp);
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc:\S+\s+msid:/i.test(line))
    .join(eol);
}

export function stripAllSsrcAttributeLines(sdp) {
  if (!sdp || !sdp.includes('a=ssrc')) {
    return sdp;
  }
  const eol = detectSdpEol(sdp);
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc-group:/i.test(line) && !/^a=ssrc:/i.test(line))
    .join(eol);
}

/** @deprecated Préférer stripAllSsrcAttributeLines */
export function fixInvalidSsrcCnameLines(sdp) {
  return stripAllSsrcAttributeLines(sdp);
}

export function collapseDuplicateSdpMediaSections(sdp, kind) {
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

export function sanitizeInboundSdpForWebRtc(sdp) {
  let out = stripAllSsrcAttributeLines(sdp);
  out = stripLegacySsrcMsidLines(out);
  out = collapseDuplicateSdpMediaSections(out, 'audio');
  out = collapseDuplicateSdpMediaSections(out, 'video');
  return normalizeSdpCrLf(out);
}
