import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  logAfwCall,
  logCallEndEmit,
  logRemoteStreamReceived,
  logRemoteTrackReceived,
  logSdpSend,
  summarizeCallSdp,
} from './callDiagnosticLog';

describe('callDiagnosticLog', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logAfwCall émet [AFW_CALL] via console.error', () => {
    logAfwCall('accept_rx', { callId: 'call-1', role: 'caller' });
    expect(errorSpy).toHaveBeenCalled();
    const line = String(errorSpy.mock.calls[0]?.join(' ') || '');
    expect(line).toContain('[AFW_CALL]');
    expect(line).toContain('accept_rx');
    expect(line).toContain('call-1');
  });

  it('logSdpSend émet [SDP_SEND]', () => {
    logSdpSend({ callId: 'c1', type: 'offer', sdpLen: 120 });
    const line = String(errorSpy.mock.calls[0]?.join(' ') || '');
    expect(line).toContain('[SDP_SEND]');
    expect(line).toContain('"type":"offer"');
  });

  it('logCallEndEmit émet [CALL_END_EMIT]', () => {
    logCallEndEmit({ reason: 'failed', callId: 'c2' });
    const line = String(errorSpy.mock.calls[0]?.join(' ') || '');
    expect(line).toContain('[CALL_END_EMIT]');
  });

  it('logRemoteTrackReceived émet [REMOTE_TRACK_RECEIVED]', () => {
    logRemoteTrackReceived({ trackId: 'v1', trackKind: 'video', readyState: 'live' });
    const line = String(errorSpy.mock.calls[0]?.join(' ') || '');
    expect(line).toContain('[REMOTE_TRACK_RECEIVED]');
    expect(line).toContain('v1');
  });

  it('logRemoteStreamReceived émet [REMOTE_STREAM_RECEIVED]', () => {
    logRemoteStreamReceived({ streamId: 's1', videoTracks: 1, audioTracks: 1 });
    const line = String(errorSpy.mock.calls[0]?.join(' ') || '');
    expect(line).toContain('[REMOTE_STREAM_RECEIVED]');
    expect(line).toContain('"videoTracks":1');
  });

  it('summarizeCallSdp détecte audio/vidéo', () => {
    const sdp = ['v=0', 'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'm=video 9 UDP/TLS/RTP/SAVPF 96'].join('\r\n');
    expect(summarizeCallSdp(sdp, 'offer')).toEqual({
      type: 'offer',
      sdpLen: sdp.length,
      hasAudio: true,
      hasVideo: true,
    });
  });
});
