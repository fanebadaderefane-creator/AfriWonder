/**
 * ⛔ Tests de régression signalisation appels — ne pas supprimer ni affaiblir.
 * Toute modif de callSignalingPayload.ts doit garder cette suite verte.
 */
import { describe, expect, it } from 'vitest';
import {
  buildCallAcceptPayload,
  callIdsEqual,
  callSdpNegotiationOptions,
  callUserIdsEqual,
  coerceSessionDescriptionInit,
  countSdpMediaSections,
  inferSdpTypeForPeerConnection,
  normalizeInboundCallSignal,
  normalizeOutboundSessionDescription,
  pickOutboundCallSdp,
} from './callSignalingPayload';

const SAMPLE_SDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1';

describe('callSignalingPayload', () => {
  it('callUserIdsEqual normalise UUID et ignore la casse', () => {
    const id = '5DA193B6-ED66-4C93-AC48-DE4D72D77D39';
    expect(callUserIdsEqual(id, id.toLowerCase())).toBe(true);
    expect(callUserIdsEqual('  abc  ', 'abc')).toBe(true);
    expect(callUserIdsEqual('a', 'b')).toBe(false);
  });

  it('buildCallAcceptPayload maps accepter as fromUserId and caller as toUserId', () => {
    expect(
      buildCallAcceptPayload({
        callId: 'call-1',
        accepterUserId: 'user-b',
        callerUserId: 'user-a',
        type: 'video',
      }),
    ).toEqual({
      callId: 'call-1',
      fromUserId: 'user-b',
      toUserId: 'user-a',
      type: 'video',
    });
  });

  it('inferSdpTypeForPeerConnection déduit answer après offer local', () => {
    expect(inferSdpTypeForPeerConnection('have-local-offer')).toBe('answer');
    expect(inferSdpTypeForPeerConnection('stable')).toBe('offer');
  });

  it('coerceSessionDescriptionInit répare SDP sans type (have-local-offer)', () => {
    expect(coerceSessionDescriptionInit({ sdp: SAMPLE_SDP }, 'have-local-offer')).toEqual({
      type: 'answer',
      sdp: SAMPLE_SDP,
    });
    expect(coerceSessionDescriptionInit(SAMPLE_SDP, 'have-local-offer')).toEqual({
      type: 'answer',
      sdp: SAMPLE_SDP,
    });
  });

  it('normalizeInboundCallSignal supporte legacy DirectCall offer/answer', () => {
    expect(
      normalizeInboundCallSignal({ kind: 'answer', sdp: { type: 'answer', sdp: SAMPLE_SDP } }, 'have-local-offer'),
    ).toEqual({ kind: 'sdp', sdp: { type: 'answer', sdp: SAMPLE_SDP } });
  });

  it('normalizeInboundCallSignal ignore signal invalide', () => {
    expect(normalizeInboundCallSignal({ kind: 'sdp', sdp: {} }, 'have-local-offer')).toBeNull();
  });

  it('normalizeOutboundSessionDescription exige type et sdp', () => {
    expect(normalizeOutboundSessionDescription({ type: 'offer', sdp: SAMPLE_SDP })).toEqual({
      type: 'offer',
      sdp: SAMPLE_SDP,
    });
    expect(coerceSessionDescriptionInit({ sdp: SAMPLE_SDP })).toBeNull();
  });

  it('callIdsEqual normalise espaces', () => {
    expect(callIdsEqual(' call-1 ', 'call-1')).toBe(true);
    expect(callIdsEqual('call-1', 'call-2')).toBe(false);
  });

  it('pickOutboundCallSdp préfère localDescription du PeerConnection', () => {
    const pc = {
      signalingState: 'have-local-offer',
      localDescription: { type: 'offer', sdp: SAMPLE_SDP },
    } as RTCPeerConnection;
    expect(pickOutboundCallSdp(pc, { type: 'answer', sdp: 'v=0\nwrong' })).toEqual({
      type: 'offer',
      sdp: SAMPLE_SDP,
    });
  });

  it('pickOutboundCallSdp retombe sur fallback si localDescription invalide', () => {
    const pc = {
      signalingState: 'have-local-offer',
      localDescription: { sdp: SAMPLE_SDP },
    } as RTCPeerConnection;
    expect(pickOutboundCallSdp(pc, { type: 'offer', sdp: SAMPLE_SDP })).toEqual({
      type: 'offer',
      sdp: SAMPLE_SDP,
    });
  });

  it('pickOutboundCallSdp force type offer sans fallback (Android sans type)', () => {
    const pc = {
      signalingState: 'have-local-offer',
      localDescription: { sdp: SAMPLE_SDP },
    } as RTCPeerConnection;
    expect(pickOutboundCallSdp(pc)).toEqual({
      type: 'offer',
      sdp: SAMPLE_SDP,
    });
  });

  it('normalizeInboundCallSignal répare sdp imbriqué sans type (régression prod)', () => {
    expect(
      normalizeInboundCallSignal(
        { kind: 'sdp', sdp: { sdp: SAMPLE_SDP } },
        'have-local-offer',
      ),
    ).toEqual({ kind: 'sdp', sdp: { type: 'answer', sdp: SAMPLE_SDP } });
  });

  it('normalizeInboundCallSignal accepte ICE candidate', () => {
    expect(
      normalizeInboundCallSignal({
        kind: 'ice',
        candidate: { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 },
      }),
    ).toEqual({
      kind: 'ice',
      candidate: { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 },
    });
  });

  it('callSdpNegotiationOptions ne passe AUCUNE contrainte héritée offerToReceive* (régression mid=1)', () => {
    // Réintroduire { offerToReceiveAudio, offerToReceiveVideo } recrée une 2e
    // section audio en Unified Plan → setRemoteDescription échoue côté appelant.
    expect(callSdpNegotiationOptions()).toBeUndefined();
  });

  it("countSdpMediaSections détecte une section audio dupliquée (mid='1')", () => {
    const singleAudio = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'a=sendrecv',
    ].join('\r\n');
    const duplicateAudio = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'a=sendrecv',
      'm=audio 0 UDP/TLS/RTP/SAVPF 111',
      'a=mid:1',
      'a=recvonly',
    ].join('\r\n');
    const audioVideo = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=mid:1',
    ].join('\r\n');

    expect(countSdpMediaSections(singleAudio, 'audio')).toBe(1);
    expect(countSdpMediaSections(duplicateAudio, 'audio')).toBe(2);
    expect(countSdpMediaSections(audioVideo, 'audio')).toBe(1);
    expect(countSdpMediaSections(audioVideo, 'video')).toBe(1);
    expect(countSdpMediaSections(undefined, 'audio')).toBe(0);
  });
});
