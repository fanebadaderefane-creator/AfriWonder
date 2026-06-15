/** Tests parseur type de candidat ICE — preuve génération/échange relay (TURN). */
import { describe, expect, it } from 'vitest';
import { parseIceCandidateMeta, summarizeCallSdp } from './callDiagnosticLog';

describe('parseIceCandidateMeta', () => {
  it('détecte un candidat host udp', () => {
    expect(
      parseIceCandidateMeta('candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host'),
    ).toEqual({ type: 'host', protocol: 'udp' });
  });

  it('détecte un candidat srflx', () => {
    expect(
      parseIceCandidateMeta(
        'candidate:2 1 udp 1686052607 1.2.3.4 50001 typ srflx raddr 192.168.1.10 rport 50000',
      ),
    ).toEqual({ type: 'srflx', protocol: 'udp' });
  });

  it('détecte un candidat relay (TURN) tcp', () => {
    expect(
      parseIceCandidateMeta(
        'candidate:3 1 tcp 41819902 5.6.7.8 49152 typ relay raddr 1.2.3.4 rport 50001',
      ),
    ).toEqual({ type: 'relay', protocol: 'tcp' });
  });

  it('détecte prflx', () => {
    expect(parseIceCandidateMeta('candidate:4 1 udp 1 9.9.9.9 1 typ prflx').type).toBe('prflx');
  });

  it('renvoie null pour entrée vide ou invalide', () => {
    expect(parseIceCandidateMeta('')).toEqual({ type: null, protocol: null });
    expect(parseIceCandidateMeta(null)).toEqual({ type: null, protocol: null });
    expect(parseIceCandidateMeta(undefined)).toEqual({ type: null, protocol: null });
  });

  it('ignore un protocole non standard', () => {
    expect(parseIceCandidateMeta('candidate:5 1 sctp 1 1.1.1.1 1 typ host').protocol).toBeNull();
  });
});

describe('summarizeCallSdp', () => {
  it('compte les candidats ICE embarqués', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host',
      'a=candidate:2 1 udp 41819902 5.6.7.8 49152 typ relay raddr 1.2.3.4 rport 50001',
    ].join('\r\n');
    expect(summarizeCallSdp(sdp, 'offer')).toMatchObject({
      type: 'offer',
      iceHost: 1,
      iceRelay: 1,
      iceTotal: 2,
    });
  });

  it('renvoie zéro candidat si SDP nu', () => {
    expect(summarizeCallSdp('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111', 'offer')).toMatchObject({
      iceTotal: 0,
      iceRelay: 0,
    });
  });
});
