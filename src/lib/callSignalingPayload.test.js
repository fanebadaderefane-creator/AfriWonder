import { describe, expect, it } from 'vitest';
import {
  coerceSessionDescriptionInit,
  normalizeInboundCallSignal,
  pickOutboundCallSdp,
} from './callSignalingPayload';

const SAMPLE_SDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1';

describe('callSignalingPayload (PWA)', () => {
  it('normalizeInboundCallSignal — kind sdp mobile', () => {
    expect(
      normalizeInboundCallSignal(
        { kind: 'sdp', sdp: { type: 'answer', sdp: SAMPLE_SDP } },
        'have-local-offer',
      ),
    ).toEqual({ kind: 'sdp', sdp: { type: 'answer', sdp: SAMPLE_SDP } });
  });

  it('normalizeInboundCallSignal — legacy offer', () => {
    expect(
      normalizeInboundCallSignal({ kind: 'offer', sdp: SAMPLE_SDP }, 'stable'),
    ).toEqual({ kind: 'sdp', sdp: { type: 'offer', sdp: SAMPLE_SDP } });
  });

  it('normalizeInboundCallSignal — ICE mobile', () => {
    expect(
      normalizeInboundCallSignal({ kind: 'ice', candidate: { candidate: 'x' } }),
    ).toEqual({ kind: 'ice', candidate: { candidate: 'x' } });
  });

  it('coerceSessionDescriptionInit répare type manquant', () => {
    expect(coerceSessionDescriptionInit({ sdp: SAMPLE_SDP }, 'have-local-offer')).toEqual({
      type: 'answer',
      sdp: SAMPLE_SDP,
    });
  });

  it('pickOutboundCallSdp préfère localDescription', () => {
    const pc = {
      signalingState: 'have-local-offer',
      localDescription: { type: 'offer', sdp: SAMPLE_SDP },
    };
    expect(pickOutboundCallSdp(pc, { type: 'answer', sdp: 'bad' })).toEqual({
      type: 'offer',
      sdp: SAMPLE_SDP,
    });
  });
});
