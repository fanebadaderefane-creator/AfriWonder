/**
 * Unified Plan browsers reject legacy Plan-B a=ssrc msid lines from react-native-webrtc.
 * Parité PWA avec frontend/src/call/callSdpWebCompat.ts
 */
export function stripLegacySsrcMsidLines(sdp) {
  if (!sdp || !sdp.includes('a=ssrc:') || !sdp.includes(' msid:')) {
    return sdp;
  }
  const eol = sdp.includes('\r\n') ? '\r\n' : '\n';
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc:\S+\s+msid:/i.test(line))
    .join(eol);
}

export function sanitizeInboundSdpForWebRtc(sdp) {
  return stripLegacySsrcMsidLines(sdp);
}
