import { describe, expect, it } from 'vitest';
import { sanitizeInboundSdpForWebRtc, stripLegacySsrcMsidLines } from './callSdpWebCompat';

const LEGACY_SSRC_MSID =
  'a=ssrc:4200685331 msid:bc0ac7c1-b180-46e1-9fde-d2de55bf31e0 410c4195-dd6d-41dc-b3aa-619e20fcea8e';

describe('stripLegacySsrcMsidLines', () => {
  it('removes Plan-B a=ssrc msid lines that Chrome rejects', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=msid:stream track',
      LEGACY_SSRC_MSID,
      'a=ssrc:4200685331 cname:abc',
    ].join('\r\n');

    const out = stripLegacySsrcMsidLines(sdp);
    expect(out).not.toContain(LEGACY_SSRC_MSID);
    expect(out).toContain('a=msid:stream track');
    expect(out).toContain('a=ssrc:4200685331 cname:abc');
  });

  it('preserves SDP without legacy ssrc msid lines', () => {
    const sdp = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=sendrecv\r\n';
    expect(stripLegacySsrcMsidLines(sdp)).toBe(sdp);
  });
});

describe('sanitizeInboundSdpForWebRtc', () => {
  it('delegates to stripLegacySsrcMsidLines', () => {
    const sdp = 'v=0\r\n' + LEGACY_SSRC_MSID + '\r\n';
    expect(sanitizeInboundSdpForWebRtc(sdp)).toBe(stripLegacySsrcMsidLines(sdp));
  });
});
