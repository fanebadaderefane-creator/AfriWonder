import { describe, expect, it } from 'vitest';
import {
  getNativeCallLaunchBlockReason,
  nativeCallLaunchBlockedMessage,
} from './openNativeCallScreenLogic';

describe('openNativeCallScreen', () => {
  it('allows web when browser WebRTC is available', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'web',
        callsOnNative: true,
        hasWebRtcRuntime: true,
        peerUserId: 'u1',
      }),
    ).toBeNull();
  });

  it('blocks web without WebRTC and Expo Go (no native module)', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'web',
        callsOnNative: true,
        hasWebRtcRuntime: false,
        peerUserId: 'u1',
      }),
    ).toBe('web_no_webrtc');
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'android',
        callsOnNative: true,
        hasWebRtcRuntime: false,
        peerUserId: 'u1',
      }),
    ).toBe('no_webrtc_module');
  });

  it('allows launch when native WebRTC and peer are ready', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'ios',
        callsOnNative: true,
        hasWebRtcRuntime: true,
        peerUserId: 'peer-42',
      }),
    ).toBeNull();
  });

  it('nativeCallLaunchBlockedMessage mentions Expo Go for missing module', () => {
    const msg = nativeCallLaunchBlockedMessage('no_webrtc_module');
    expect(msg.toLowerCase()).toContain('expo go');
  });
});
