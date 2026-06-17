import { describe, expect, it } from 'vitest';
import {
  collapseDuplicateSdpMediaSections,
  normalizeSdpCrLf,
  sanitizeInboundSdpForWebRtc,
  stripAllSsrcAttributeLines,
  stripLegacySsrcMsidLines,
} from './callSdpWebCompat';

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

describe('normalizeSdpCrLf', () => {
  it('converts LF-only SDP to CRLF (parseur natif APK)', () => {
    const lfOnly = 'v=0\nm=audio 9 UDP/TLS/RTP/SAVPF 111\na=sendrecv\n';
    const out = normalizeSdpCrLf(lfOnly);
    expect(out.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true);
    expect(out).toContain('v=0\r\n');
    expect(out.endsWith('\r\n')).toBe(true);
  });

  it('sanitizeInbound normalizes LF + strips ssrc for setRemoteDescription', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=ssrc:3921240401 cname:1c38f20e-5159-4558-adf8-7a450653d358',
      'a=sendrecv',
    ].join('\n');
    const out = sanitizeInboundSdpForWebRtc(sdp);
    expect(out).not.toContain('a=ssrc:');
    expect(out).toContain('a=sendrecv\r\n');
    expect(out.endsWith('\r\n')).toBe(true);
  });
});

describe('stripAllSsrcAttributeLines', () => {
  it('removes a=ssrc cname lines that Chrome rejects (Invalid SDP line)', () => {
    const sdp =
      'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=ssrc:3921240401 cname:1c38f20e-5159-4558-adf8-7a450653d358\r\n';
    const out = stripAllSsrcAttributeLines(sdp);
    expect(out).not.toContain('a=ssrc:');
    expect(out).toContain('m=audio');
  });

  it('removes a=ssrc-group and brace cname variants', () => {
    const sdp =
      'v=0\r\na=ssrc-group:FID 1 2\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=ssrc:653906106 cname:{02f4fcf5-c70c-4e40-8911-308e3774b5f2}\r\n';
    const out = stripAllSsrcAttributeLines(sdp);
    expect(out).not.toContain('a=ssrc');
    expect(out).toContain('m=audio');
  });
});

describe('collapseDuplicateSdpMediaSections', () => {
  it("keeps first m=audio only (régression mid='1')", () => {
    const duplicateAudio = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'a=sendrecv',
      'm=audio 0 UDP/TLS/RTP/SAVPF 111',
      'a=mid:1',
      'a=recvonly',
    ].join('\r\n');

    const out = collapseDuplicateSdpMediaSections(duplicateAudio, 'audio');
    expect(out.match(/^m=audio/gm)?.length).toBe(1);
    expect(out).toContain('a=mid:0');
    expect(out).not.toContain('a=mid:1');
  });

  it('preserves audio + video (mid 1 = video, not duplicate audio)', () => {
    const audioVideo = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=mid:1',
    ].join('\r\n');

    const out = collapseDuplicateSdpMediaSections(audioVideo, 'audio');
    expect(out.match(/^m=audio/gm)?.length).toBe(1);
    expect(out).toContain('m=video');
    expect(out).toContain('a=mid:1');
  });
});

describe('sanitizeInboundSdpForWebRtc', () => {
  it('applies legacy msid, cname brace, and duplicate audio fixes', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      LEGACY_SSRC_MSID,
      'a=ssrc:653906106 cname:{02f4fcf5-c70c-4e40-8911-308e3774b5f2}',
      'm=audio 0 UDP/TLS/RTP/SAVPF 111',
      'a=mid:1',
      'a=recvonly',
    ].join('\r\n');

    const out = sanitizeInboundSdpForWebRtc(sdp);
    expect(out).not.toContain(LEGACY_SSRC_MSID);
    expect(out).not.toContain('a=ssrc:');
    expect(out).not.toContain('a=mid:1');
    expect(out.match(/^m=audio/gm)?.length).toBe(1);
  });
});
