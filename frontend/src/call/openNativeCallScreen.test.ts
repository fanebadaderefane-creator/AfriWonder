import { describe, expect, it } from 'vitest';
import {
  getNativeCallLaunchBlockReason,
  nativeCallLaunchBlockedMessage,
} from './openNativeCallScreenLogic';

describe('openNativeCallScreen', () => {
  it('blocks web and Expo Go (no WebRTC module)', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'web',
        callsOnNative: true,
        hasWebRtcModule: true,
        peerUserId: 'u1',
      }),
    ).toBe('web');
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'android',
        callsOnNative: true,
        hasWebRtcModule: false,
        peerUserId: 'u1',
      }),
    ).toBe('no_webrtc_module');
  });

  it('allows launch when native WebRTC and peer are ready', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'ios',
        callsOnNative: true,
        hasWebRtcModule: true,
        peerUserId: 'peer-42',
      }),
    ).toBeNull();
  });

  it('nativeCallLaunchBlockedMessage mentions Expo Go for missing module', () => {
    const msg = nativeCallLaunchBlockedMessage('no_webrtc_module');
    expect(msg.toLowerCase()).toContain('expo go');
  });
});
