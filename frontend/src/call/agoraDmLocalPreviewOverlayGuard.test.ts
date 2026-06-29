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

  it('plein écran — overlay root unique (surface stable)', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        ...ready,
        containerStyle: 'full',
      }),
    ).toBe(true);
  });

  it('PiP — overlay root actif', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        ...ready,
        containerStyle: 'pip',
      }),
    ).toBe(true);
  });

  it('caméra off (hidden) — surface reste montée', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        ...ready,
        containerStyle: 'hidden',
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
