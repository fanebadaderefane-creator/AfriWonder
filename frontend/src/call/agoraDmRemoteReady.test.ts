import { describe, expect, it } from 'vitest';
import { shouldFlushAgoraDmConnected, shouldLogAgoraRemoteReady } from './agoraDmRemoteReady';

describe('agoraDmRemoteReady', () => {
  it('log agora_remote_ready une seule fois', () => {
    expect(shouldLogAgoraRemoteReady(false)).toBe(true);
    expect(shouldLogAgoraRemoteReady(true)).toBe(false);
  });

  it('flush connecté — accepté + canal + distant', () => {
    expect(
      shouldFlushAgoraDmConnected({
        peerAccepted: true,
        callState: 'connecting',
        joined: true,
        remoteJoined: true,
      }),
    ).toBe(true);
  });

  it('pas de flush si event Agora avant accept (ringing)', () => {
    expect(
      shouldFlushAgoraDmConnected({
        peerAccepted: false,
        callState: 'ringing',
        joined: true,
        remoteJoined: true,
      }),
    ).toBe(false);
  });
});
