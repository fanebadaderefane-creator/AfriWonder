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

  it('Android — jamais setupLocalVideo JS (RtcTextureView canvas)', () => {
    expect(shouldAgoraDmSkipSetupLocalVideo('android')).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'join_ok', true)).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'surface_layout_110x156')).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('android', 'overlay_layout_pip_call', true)).toBe(true);
    expect(shouldAgoraDmSkipSetupLocalVideo('ios', 'join_ok', true)).toBe(false);
  });

  it('maybeStartAgoraDmEnginePreview — Android skip direct', async () => {
    const { maybeStartAgoraDmEnginePreview } = await import('./agoraCallVideoBind.native');
    const engine = { startPreview: vi.fn() };
    maybeStartAgoraDmEnginePreview(engine as never, { callId: 'c1' }, false);
    expect(engine.startPreview).not.toHaveBeenCalled();
  });

  it('syncAgoraLocalVideoCanvas — Android surface_layout déclenche startPreview', async () => {
    const { syncAgoraLocalVideoCanvas } = await import('./agoraCallVideoBind.native');
    const { resolveAgoraDmCanvasStartPreview } = await import('./agoraDmPipPosition');
    const engine = { setupLocalVideo: vi.fn(), startPreview: vi.fn() };
    const reason = 'surface_layout_110x156';
    syncAgoraLocalVideoCanvas(
      engine as never,
      { reason, callId: 'c1' },
      { startPreview: resolveAgoraDmCanvasStartPreview(reason, false, 'android') },
    );
    expect(engine.setupLocalVideo).not.toHaveBeenCalled();
    expect(engine.startPreview).toHaveBeenCalled();
  });
});
