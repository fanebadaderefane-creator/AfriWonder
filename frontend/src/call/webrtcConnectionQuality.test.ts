import { describe, expect, it } from 'vitest';
import {
  connectionQualityFromRtcStatsReport,
  iceSelectedCandidateFromRtcStatsReport,
  rtpMediaStatsFromRtcStatsReport,
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
