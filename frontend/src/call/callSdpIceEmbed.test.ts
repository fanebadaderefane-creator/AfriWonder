/** Tests injection ICE dans SDP — régression Maroc↔Mali (RN sans candidats dans localDescription). */
import { describe, expect, it } from 'vitest';
import {
  buildOutboundSdpWithEmbeddedIce,
  decideIceGatheringWaitWithBuffer,
  embedIceCandidatesInSdp,
  iceCandidateInitCounts,
} from './callSdpIceEmbed';

const BARE_SDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';

const RELAY_CAND = {
  candidate:
    'candidate:3 1 udp 41819902 5.6.7.8 49152 typ relay raddr 1.2.3.4 rport 50001',
  sdpMid: '0',
  sdpMLineIndex: 0,
};

describe('embedIceCandidatesInSdp', () => {
  it('ajoute les lignes a=candidate au SDP nu', () => {
    const out = embedIceCandidatesInSdp(BARE_SDP, [RELAY_CAND]);
    expect(out).toContain('a=candidate:3 1 udp');
    expect(out).toContain('typ relay');
    expect(out.match(/a=candidate:/g)?.length).toBe(1);
  });

  it('déduplique les candidats identiques', () => {
    const out = embedIceCandidatesInSdp(BARE_SDP, [RELAY_CAND, RELAY_CAND]);
    expect(out.match(/a=candidate:/g)?.length).toBe(1);
  });
});

describe('iceCandidateInitCounts', () => {
  it('compte relay depuis onicecandidate', () => {
    expect(iceCandidateInitCounts([RELAY_CAND])).toMatchObject({ relay: 1, total: 1 });
  });
});

describe('decideIceGatheringWaitWithBuffer', () => {
  it('relay_ready quand le buffer contient un relay même si SDP nu', () => {
    expect(
      decideIceGatheringWaitWithBuffer({
        iceGatheringState: 'gathering',
        sdp: BARE_SDP,
        gatheredCandidates: [RELAY_CAND],
        elapsedMs: 100,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: true, reason: 'relay_ready' });
  });

  it('continue à attendre si SDP nu et buffer vide', () => {
    expect(
      decideIceGatheringWaitWithBuffer({
        iceGatheringState: 'gathering',
        sdp: BARE_SDP,
        gatheredCandidates: [],
        elapsedMs: 100,
        maxWaitMs: 2500,
      }),
    ).toEqual({ done: false, reason: 'waiting' });
  });
});

describe('buildOutboundSdpWithEmbeddedIce', () => {
  it('produit un SDP avec relay embarqué', () => {
    const r = buildOutboundSdpWithEmbeddedIce({
      sdp: BARE_SDP,
      type: 'offer',
      gatheredCandidates: [RELAY_CAND],
    });
    expect(r.type).toBe('offer');
    expect(r.counts.relay).toBe(1);
    expect(r.embeddedCount).toBe(1);
  });
});
