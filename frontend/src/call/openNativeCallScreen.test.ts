import { describe, expect, it } from 'vitest';
import {
  buildReceiverCallRouteParams,
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
  });

  it('blocks android without WebRTC when Agora DM désactivé', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'android',
        callsOnNative: true,
        hasWebRtcRuntime: false,
        dmCallsUseAgora: false,
        hasAgoraRtc: true,
        peerUserId: 'u1',
      }),
    ).toBe('no_webrtc_module');
  });

  it('allows android Agora DM without react-native-webrtc', () => {
    expect(
      getNativeCallLaunchBlockReason({
        platformOs: 'android',
        callsOnNative: true,
        hasWebRtcRuntime: false,
        dmCallsUseAgora: true,
        hasAgoraRtc: true,
        peerUserId: 'u1',
      }),
    ).toBeNull();
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

  it('nativeCallLaunchBlockedMessage mentions APK for missing module', () => {
    const msg = nativeCallLaunchBlockedMessage('no_webrtc_module');
    expect(msg.toLowerCase()).toContain('apk');
  });

  it('buildReceiverCallRouteParams unifie peerId et otherUserId', () => {
    const params = buildReceiverCallRouteParams({
      callId: 'call-1',
      peerUserId: 'user-b',
      peerName: 'Ada',
      peerAvatar: 'https://cdn/ava.jpg',
      type: 'video',
    });
    expect(params.role).toBe('receiver');
    expect(params.otherUserId).toBe('user-b');
    expect(params.peerId).toBe('user-b');
    expect(params.type).toBe('video');
    expect(params.callType).toBe('video');
    expect(params.name).toBe('Ada');
  });
});
