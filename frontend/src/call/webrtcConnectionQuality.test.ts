import { describe, expect, it } from 'vitest';
import { connectionQualityFromRtcStatsReport, iceSelectedCandidateFromRtcStatsReport } from './webrtcConnectionQuality';

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
