import { describe, expect, it } from 'vitest';
import {
  connectionQualityFromRtcStatsReport,
  iceSelectedCandidateFromRtcStatsReport,
  rtpMediaStatsFromRtcStatsReport,
  transportStatsFromRtcStatsReport,
  classifyConnectedCallMediaVerdict,
  CONNECTED_MEDIA_VERDICT_GRACE_MS,
} from './webrtcConnectionQuality';

function mockReport(entries: Record<string, unknown>[]) {
  return {
    values() {
      return entries[Symbol.iterator]();
    },
  };
}

describe('connectionQualityFromRtcStatsReport', () => {
  it('returns good for low RTT and low loss', () => {
    const q = connectionQualityFromRtcStatsReport(
      mockReport([
        { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.08 },
        { type: 'remote-inbound-rtp', fractionLost: 0.01 },
      ]),
    );
    expect(q.quality).toBe('good');
    expect(q.labelFr).toBe('Bonne connexion');
    expect(q.bars).toBe(3);
  });

  it('returns poor for high RTT', () => {
    const q = connectionQualityFromRtcStatsReport(
      mockReport([{ type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.55 }]),
    );
    expect(q.quality).toBe('poor');
    expect(q.bars).toBe(1);
  });

  it('handles empty stats', () => {
    const q = connectionQualityFromRtcStatsReport(mockReport([]));
    expect(q.bars).toBe(2);
  });
});

describe('iceSelectedCandidateFromRtcStatsReport', () => {
  it('détecte relay TURN', () => {
    const ice = iceSelectedCandidateFromRtcStatsReport(
      mockReport([
        {
          id: 'pair1',
          type: 'candidate-pair',
          state: 'succeeded',
          localCandidateId: 'local1',
          remoteCandidateId: 'remote1',
        },
        { id: 'local1', type: 'local-candidate', candidateType: 'relay', protocol: 'udp' },
        { id: 'remote1', type: 'remote-candidate', candidateType: 'srflx' },
      ]),
    );
    expect(ice.relayUsed).toBe(true);
    expect(ice.localType).toBe('relay');
  });
});

describe('rtpMediaStatsFromRtcStatsReport', () => {
  it('agrège inbound et outbound par kind', () => {
    const rtp = rtpMediaStatsFromRtcStatsReport(
      mockReport([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 120,
          bytesReceived: 48000,
        },
        {
          type: 'inbound-rtp',
          kind: 'video',
          packetsReceived: 800,
          bytesReceived: 900000,
          framesDecoded: 240,
        },
        {
          type: 'outbound-rtp',
          kind: 'audio',
          packetsSent: 115,
          bytesSent: 46000,
        },
        {
          type: 'outbound-rtp',
          kind: 'video',
          packetsSent: 750,
          bytesSent: 850000,
        },
      ]),
    );
    expect(rtp.audio).toEqual({
      kind: 'audio',
      packetsReceived: 120,
      bytesReceived: 48000,
      packetsSent: 115,
      bytesSent: 46000,
      framesDecoded: 0,
    });
    expect(rtp.video).toEqual({
      kind: 'video',
      packetsReceived: 800,
      bytesReceived: 900000,
      packetsSent: 750,
      bytesSent: 850000,
      framesDecoded: 240,
    });
  });

  it('retourne null si aucune entrée RTP', () => {
    const rtp = rtpMediaStatsFromRtcStatsReport(
      mockReport([{ type: 'candidate-pair', state: 'succeeded' }]),
    );
    expect(rtp.audio).toBeNull();
    expect(rtp.video).toBeNull();
  });
});

describe('transportStatsFromRtcStatsReport', () => {
  it('détecte DTLS connecté et la paire sélectionnée', () => {
    const t = transportStatsFromRtcStatsReport(
      mockReport([
        {
          type: 'transport',
          dtlsState: 'connected',
          iceState: 'connected',
          bytesSent: 120000,
          bytesReceived: 98000,
          selectedCandidatePairId: 'pair-1',
        },
        {
          id: 'pair-1',
          type: 'candidate-pair',
          state: 'succeeded',
          bytesSent: 119000,
          bytesReceived: 97000,
        },
      ]),
    );
    expect(t.dtlsState).toBe('connected');
    expect(t.iceState).toBe('connected');
    expect(t.bytesReceived).toBe(98000);
    expect(t.hasSelectedPair).toBe(true);
    expect(t.selectedPairBytesReceived).toBe(97000);
  });

  it('reflète DTLS non terminé (connecté mais aucun média)', () => {
    const t = transportStatsFromRtcStatsReport(
      mockReport([
        {
          type: 'transport',
          dtlsState: 'connecting',
          iceState: 'connected',
          bytesSent: 5000,
          bytesReceived: 0,
        },
      ]),
    );
    expect(t.dtlsState).toBe('connecting');
    expect(t.iceState).toBe('connected');
    expect(t.bytesReceived).toBe(0);
  });

  it('utilise candidate-pair succeeded si pas de selectedCandidatePairId', () => {
    const t = transportStatsFromRtcStatsReport(
      mockReport([
        { type: 'candidate-pair', state: 'succeeded', bytesSent: 10, bytesReceived: 20 },
      ]),
    );
    expect(t.hasSelectedPair).toBe(true);
    expect(t.selectedPairBytesReceived).toBe(20);
  });

  it('retourne des valeurs vides sans transport ni paire', () => {
    const t = transportStatsFromRtcStatsReport(mockReport([{ type: 'inbound-rtp', kind: 'audio' }]));
    expect(t.dtlsState).toBeNull();
    expect(t.hasSelectedPair).toBe(false);
    expect(t.bytesReceived).toBe(0);
  });
});

describe('classifyConnectedCallMediaVerdict (cause racine Maroc↔Mali)', () => {
  const connected = CONNECTED_MEDIA_VERDICT_GRACE_MS + 1000;

  it('audio bidirectionnel → ok', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: true,
      audioBytesReceived: 48000,
      audioBytesSent: 46000,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('ok');
    expect(v.oneWay).toBe(false);
  });

  it('avant le délai de grâce sans octet → pending (pas de faux verdict)', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: true,
      audioBytesReceived: 0,
      audioBytesSent: 0,
      connectedForMs: 1000,
    });
    expect(v.verdict).toBe('pending');
  });

  it('DTLS non connecté → dtls_not_connected (aucun média possible)', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connecting',
      hasSelectedPair: true,
      audioBytesReceived: 0,
      audioBytesSent: 5000,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('dtls_not_connected');
  });

  it('pas de paire ICE → no_ice_pair', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: false,
      audioBytesReceived: 0,
      audioBytesSent: 5000,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('no_ice_pair');
  });

  it('j’émets mais ne reçois rien → inbound_dead (je n’entends pas)', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: true,
      audioBytesReceived: 0,
      audioBytesSent: 46000,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('inbound_dead');
    expect(v.oneWay).toBe(true);
  });

  it('je reçois mais n’émets rien → outbound_dead (il ne m’entend pas)', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: true,
      audioBytesReceived: 48000,
      audioBytesSent: 0,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('outbound_dead');
    expect(v.oneWay).toBe(true);
  });

  it('paire + DTLS OK mais 0 octet des 2 côtés → silent_both', () => {
    const v = classifyConnectedCallMediaVerdict({
      dtlsState: 'connected',
      hasSelectedPair: true,
      audioBytesReceived: 0,
      audioBytesSent: 0,
      connectedForMs: connected,
    });
    expect(v.verdict).toBe('silent_both');
  });
});
