import { describe, expect, it } from 'vitest';
import {
  shouldShowAgoraLocalCameraPip,
  shouldShowAgoraVideoStage,
  shouldShowLocalVideoFullscreen,
  shouldShowRemoteVideoFullscreen,
  shouldShowVideoSideRail,
} from './agoraDmVideoUi';

describe('agoraDmVideoUi WhatsApp', () => {
  it('vidéo sortante — selfie plein écran avant remote', () => {
    expect(
      shouldShowLocalVideoFullscreen({
        isVideoCall: true,
        mediaEnabled: true,
        remoteEverJoined: false,
      }),
    ).toBe(true);
    expect(
      shouldShowRemoteVideoFullscreen({ isVideoCall: true, remoteJoined: false }),
    ).toBe(false);
  });

  it('connecté — distant plein écran dès onUserJoined + pip après decode', () => {
    expect(
      shouldShowRemoteVideoFullscreen({ isVideoCall: true, remoteJoined: true }),
    ).toBe(true);
    expect(
      shouldShowRemoteVideoFullscreen({
        isVideoCall: true,
        remoteJoined: true,
        remoteEverJoined: true,
      }),
    ).toBe(true);
    expect(
      shouldShowLocalVideoFullscreen({
        isVideoCall: true,
        mediaEnabled: true,
        remoteEverJoined: false,
        remoteJoined: true,
      }),
    ).toBe(false);
    expect(
      shouldShowAgoraLocalCameraPip({
        isVideoCall: true,
        camOn: true,
        remoteEverJoined: true,
      }),
    ).toBe(true);
  });

  it('caméra off — distant visible, pas de pip', () => {
    expect(
      shouldShowAgoraVideoStage({
        isVideoCall: true,
        mediaEnabled: true,
        joined: true,
        localScreenSharing: false,
        peerScreenSharing: false,
      }),
    ).toBe(true);
    expect(
      shouldShowAgoraLocalCameraPip({
        isVideoCall: true,
        camOn: false,
        remoteEverJoined: true,
      }),
    ).toBe(false);
  });

  it('rail latéral pendant sonnerie vidéo', () => {
    expect(
      shouldShowVideoSideRail({
        isVideoCall: true,
        mediaEnabled: true,
        remoteEverJoined: false,
      }),
    ).toBe(true);
  });
});
