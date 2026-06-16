/** Tests half-trickle ICE — comptage candidats SDP + décision d'attente. */
import { describe, expect, it } from 'vitest';
import { decideIceGatheringWait, sdpCandidateCounts } from './callIceGathering';

const SDP_HOST_ONLY = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'a=candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host',
].join('\r\n');

const SDP_WITH_RELAY = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'a=candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host',
  'a=candidate:2 1 udp 1686052607 1.2.3.4 50001 typ srflx raddr 192.168.1.10 rport 50000',
  'a=candidate:3 1 udp 41819902 5.6.7.8 49152 typ relay raddr 1.2.3.4 rport 50001',
].join('\r\n');

describe('sdpCandidateCounts', () => {
  it('compte par type', () => {
    expect(sdpCandidateCounts(SDP_WITH_RELAY)).toEqual({
      host: 1,
      srflx: 1,
      relay: 1,
      prflx: 0,
      total: 3,
    });
  });

  it('renvoie zéro pour un SDP sans candidat', () => {
    expect(sdpCandidateCounts('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111')).toEqual({
      host: 0,
      srflx: 0,
      relay: 0,
      prflx: 0,
      total: 0,
    });
  });

  it('gère null/undefined', () => {
    expect(sdpCandidateCounts(null).total).toBe(0);
    expect(sdpCandidateCounts(undefined).total).toBe(0);
  });
});

describe('decideIceGatheringWait', () => {
  it("avec requireRelay, complete sans relay continue d'attendre", () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'complete',
        sdp: SDP_HOST_ONLY,
        elapsedMs: 100,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: false, reason: 'waiting' });
  });

  it("s'arrête quand le gathering est complete sans requireRelay", () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'complete',
        sdp: SDP_HOST_ONLY,
        elapsedMs: 0,
        maxWaitMs: 2500,
        requireRelay: false,
      }),
    ).toEqual({ done: true, reason: 'gathering_complete' });
  });

  it("s'arrête dès qu'un candidat relay est présent", () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'gathering',
        sdp: SDP_WITH_RELAY,
        elapsedMs: 300,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: true, reason: 'relay_ready' });
  });

  it('continue à attendre si seulement host/srflx et pas encore de relay', () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'gathering',
        sdp: SDP_HOST_ONLY,
        elapsedMs: 300,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: false, reason: 'waiting' });
  });

  it("s'arrête au plafond maxWaitMs même sans relay (ne bloque jamais l'appel)", () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'gathering',
        sdp: SDP_HOST_ONLY,
        elapsedMs: 2500,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: true, reason: 'timeout' });
  });

  it('avec requireRelay=false, un candidat host suffit', () => {
    expect(
      decideIceGatheringWait({
        iceGatheringState: 'gathering',
        sdp: SDP_HOST_ONLY,
        elapsedMs: 100,
        maxWaitMs: 2500,
        requireRelay: false,
      }),
    ).toEqual({ done: true, reason: 'relay_ready' });
  });
});
