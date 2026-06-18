/** Tests injection ICE dans SDP — régression Maroc↔Mali (RN sans candidats dans localDescription). */
import { describe, expect, it } from 'vitest';
import {
  buildOutboundSdpWithEmbeddedIce,
  decideIceGatheringWaitWithBuffer,
  embedIceCandidatesInSdp,
  iceCandidateInitCounts,
  shouldAwaitIceBeforeOutboundSdp,
  shouldAwaitMinimalIceBeforeAnswerEmbed,
  shouldBlockOutboundSdpWithoutRequiredRelay,
  minimalIceGatherReady,
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

describe('shouldAwaitIceBeforeOutboundSdp', () => {
  it('attend ICE pour offer/pranswer/rollback', () => {
    expect(shouldAwaitIceBeforeOutboundSdp('offer')).toBe(true);
    expect(shouldAwaitIceBeforeOutboundSdp('pranswer')).toBe(true);
    expect(shouldAwaitIceBeforeOutboundSdp(null)).toBe(false);
  });
  it('answer natif + TURN → attente relay complète (Maroc↔Mali)', () => {
    expect(shouldAwaitIceBeforeOutboundSdp('answer', { turnConfigured: true, isNative: true })).toBe(
      true,
    );
    expect(shouldAwaitIceBeforeOutboundSdp('answer', { turnConfigured: true, isNative: false })).toBe(
      false,
    );
  });
});

describe('minimal answer ICE embed', () => {
  it('shouldAwaitMinimalIceBeforeAnswerEmbed — answer web seulement', () => {
    expect(shouldAwaitMinimalIceBeforeAnswerEmbed('answer')).toBe(true);
    expect(shouldAwaitMinimalIceBeforeAnswerEmbed('offer')).toBe(false);
    expect(
      shouldAwaitMinimalIceBeforeAnswerEmbed('answer', { turnConfigured: true, isNative: true }),
    ).toBe(false);
  });

  it('minimalIceGatherReady — candidat ou gathering complete', () => {
    expect(minimalIceGatherReady(0, 'gathering')).toBe(false);
    expect(minimalIceGatherReady(1, 'gathering')).toBe(true);
    expect(minimalIceGatherReady(0, 'complete')).toBe(true);
  });
});

describe('shouldBlockOutboundSdpWithoutRequiredRelay', () => {
  it('bloque answer/offer sans relay quand requireRelay', () => {
    expect(shouldBlockOutboundSdpWithoutRequiredRelay({ requireRelay: true, relayCount: 0 })).toBe(
      true,
    );
    expect(shouldBlockOutboundSdpWithoutRequiredRelay({ requireRelay: true, relayCount: 2 })).toBe(
      false,
    );
    expect(shouldBlockOutboundSdpWithoutRequiredRelay({ requireRelay: false, relayCount: 0 })).toBe(
      false,
    );
  });
});
