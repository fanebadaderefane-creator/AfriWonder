import { describe, expect, it, vi } from 'vitest';

import { shouldAgoraDmSkipSetupLocalVideo, shouldAgoraSwitchCameraOnNonce } from './agoraCallVideoBind';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('react-native-agora', () => ({
  RenderModeType: { RenderModeFit: 1 },
  VideoMirrorModeType: { VideoMirrorModeEnabled: 1 },
}));

describe('agoraCallVideoBind', () => {
  it('ne bascule la caméra que sur action utilisateur (nonce > 0)', () => {
    expect(shouldAgoraSwitchCameraOnNonce(0)).toBe(false);
    expect(shouldAgoraSwitchCameraOnNonce(1)).toBe(true);
  });

  it('Android — setupLocalVideo en canal ; hors canal sur layout/flip', () => {
    expect(shouldAgoraDmSkipSetupLocalVideo('android')).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'join_ok', true)).toBe(false);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'join_ok', false)).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'surface_layout_110x156')).toBe(false);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'overlay_layout_pip_call')).toBe(false);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'switch_camera', true)).toBe(false);
    expect(shouldAgoraDmSkipSetupLocalVideo('ios')).toBe(false);
  });

  it('syncAgoraLocalVideoCanvas — import local shouldAgoraDmSkipSetupLocalVideo (régression Hermes)', async () => {
    const { syncAgoraLocalVideoCanvas } = await import('./agoraCallVideoBind.native');
    const engine = { setupLocalVideo: vi.fn(), startPreview: vi.fn() };
    expect(() =>
      syncAgoraLocalVideoCanvas(engine as never, {
        reason: 'surface_layout_110x156',
        callId: 'c1',
      }),
    ).not.toThrow();
  });
});
