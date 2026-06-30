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

  it('maybeStartAgoraDmEnginePreview — Android startPreview une fois', async () => {
    const { maybeStartAgoraDmEnginePreview, resetAgoraDmAndroidStartPreviewGate } = await import(
      './agoraCallVideoBind.native'
    );
    resetAgoraDmAndroidStartPreviewGate();
    const engine = { startPreview: vi.fn() };
    maybeStartAgoraDmEnginePreview(engine as never, { callId: 'c1' }, false);
    expect(engine.startPreview).toHaveBeenCalledTimes(1);
    maybeStartAgoraDmEnginePreview(engine as never, { callId: 'c1' }, false);
    expect(engine.startPreview).toHaveBeenCalledTimes(1);
  });

  it('syncAgoraLocalVideoCanvas — Android no-op total (TextureView seul)', async () => {
    const { syncAgoraLocalVideoCanvas } = await import('./agoraCallVideoBind.native');
    const engine = { setupLocalVideo: vi.fn(), startPreview: vi.fn() };
    syncAgoraLocalVideoCanvas(
      engine as never,
      { reason: 'surface_layout_110x156', callId: 'c1' },
      { startPreview: true },
    );
    expect(engine.setupLocalVideo).not.toHaveBeenCalled();
    expect(engine.startPreview).not.toHaveBeenCalled();
  });

  it('startAgoraDmAndroidPreviewOnce — idempotent', async () => {
    const { startAgoraDmAndroidPreviewOnce, resetAgoraDmAndroidStartPreviewGate } = await import(
      './agoraCallVideoBind.native'
    );
    resetAgoraDmAndroidStartPreviewGate();
    const engine = { startPreview: vi.fn() };
    expect(startAgoraDmAndroidPreviewOnce(engine as never, { callId: 'c1' })).toBe(true);
    expect(startAgoraDmAndroidPreviewOnce(engine as never, { callId: 'c1' })).toBe(false);
    expect(engine.startPreview).toHaveBeenCalledTimes(1);
  });
});
