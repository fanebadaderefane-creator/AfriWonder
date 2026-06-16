/**
 * Unified Plan browsers (Chrome, Safari, Firefox) reject legacy Plan-B
 * a=ssrc:<id> msid:<stream> <track> lines that react-native-webrtc still emits.
 */
export function stripLegacySsrcMsidLines(sdp: string): string {
  if (!sdp || !sdp.includes('a=ssrc:') || !sdp.includes(' msid:')) {
    return sdp;
  }
  const eol = sdp.includes('\r\n') ? '\r\n' : '\n';
  return sdp
    .split(/\r?\n/)
    .filter((line) => !/^a=ssrc:\S+\s+msid:/i.test(line))
    .join(eol);
}

/** Sanitize inbound remote SDP before RTCPeerConnection.setRemoteDescription. */
export function sanitizeInboundSdpForWebRtc(sdp: string): string {
  return stripLegacySsrcMsidLines(sdp);
}
