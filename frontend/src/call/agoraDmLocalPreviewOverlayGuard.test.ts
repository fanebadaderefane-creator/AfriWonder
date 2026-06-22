import { describe, expect, it } from 'vitest';

import { shouldMountAgoraDmLocalPreviewOverlay } from './agoraDmLocalPreviewOverlayGuard';

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

  it('monte après pin + moteur prêt + mountSurface (aperçu WhatsApp)', () => {
    expect(
      shouldMountAgoraDmLocalPreviewOverlay({
        callState: 'ringing',
        isVideoCall: true,
        localPreviewPinned: true,
        localPreviewEngineReady: true,
        mountSurface: true,
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
