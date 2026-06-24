import { describe, expect, it } from 'vitest';

import { shouldMountAgoraDmLocalPreviewOverlay } from './agoraDmLocalPreviewOverlayGuard';

const ready = {
  callState: 'ringing',
  isVideoCall: true,
  localPreviewPinned: true,
  localPreviewEngineReady: true,
  mountSurface: true,
};

describe('shouldMountAgoraDmLocalPreviewOverlay', () => {
  it('refuse RtcView si active/isVideoCall sans localPreviewPinned (crash 1re frame)', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        callState: 'ringing',
        isVideoCall: true,
        localPreviewPinned: false,
        localPreviewEngineReady: false,
        mountSurface: true,
      }),
    ).toBe(false);
  });

  it('refuse RtcView si pin sans moteur prêt', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        callState: 'ringing',
        isVideoCall: true,
        localPreviewPinned: true,
        localPreviewEngineReady: false,
        mountSurface: true,
      }),
    ).toBe(false);
  });

  it('plein écran — overlay root désactivé (preview dans DirectCallAgoraScreen)', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        ...ready,
        containerStyle: 'full',
      }),
    ).toBe(false);
  });

  it('PiP — overlay root actif', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        ...ready,
        containerStyle: 'pip',
      }),
    ).toBe(true);
  });

  it('jamais en appel vocal', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        callState: 'connected',
        isVideoCall: false,
        localPreviewPinned: true,
        localPreviewEngineReady: true,
        mountSurface: true,
      }),
    ).toBe(false);
  });
});
