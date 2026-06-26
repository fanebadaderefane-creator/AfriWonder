import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearCallMediaAlive,
  peekCallMediaAliveSnapshot,
  shouldSuppressCallInterruptedUi,
  syncAgoraCallMediaAlive,
  syncWebRtcCallMediaAlive,
  isWebRtcMediaStillConnected,
} from './callMediaAliveRegistry';

describe('callMediaAliveRegistry', () => {
  beforeEach(() => {
    clearCallMediaAlive();
  });

  it('syncWebRtcCallMediaAlive — connected PC = alive', () => {
    syncWebRtcCallMediaAlive({
      callId: 'c1',
      callState: 'connecting',
      connectionState: 'connected',
      iceConnectionState: 'checking',
      localStream: { getAudioTracks: () => [{ id: 'a1' }] },
      remoteStream: null,
    });
    const snap = peekCallMediaAliveSnapshot();
    expect(snap.alive).toBe(true);
    expect(snap.engine).toBe('webrtc');
    expect(snap.localAudioTracks).toBe(1);
    expect(shouldSuppressCallInterruptedUi()).toBe(true);
  });

  it('shouldSuppressCallInterruptedUi — false when WebRTC closed', () => {
    syncWebRtcCallMediaAlive({
      callState: 'ended',
      connectionState: 'closed',
      iceConnectionState: 'closed',
    });
    expect(shouldSuppressCallInterruptedUi()).toBe(false);
  });

  it('syncAgoraCallMediaAlive — alive agora session', () => {
    syncAgoraCallMediaAlive({ callId: 'ag-1', alive: true, callState: 'connected' });
    expect(shouldSuppressCallInterruptedUi()).toBe(true);
  });

  it('isWebRtcMediaStillConnected — ice completed', () => {
    expect(
      isWebRtcMediaStillConnected({
        connectionState: 'new',
        iceConnectionState: 'completed',
        callState: 'connecting',
      }),
    ).toBe(true);
  });
});
