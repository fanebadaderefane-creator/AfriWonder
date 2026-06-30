import { describe, expect, it } from 'vitest';
import {
  AGORA_DM_CALL_DOCK_DP,
  AGORA_DM_CALL_TOP_CHROME_DP,
  AGORA_DM_OVERLAY_Z_CALL_PIP,
  AGORA_DM_OVERLAY_Z_CALL_VIDEO,
  AGORA_DM_OVERLAY_Z_PIP_FLOAT,
  resolveAgoraDmOverlayHostLayout,
  resolveAgoraDmOverlayLayer,
} from './agoraDmOverlayLayer';

describe('resolveAgoraDmOverlayLayer', () => {
  it('plein écran sur écran d’appel — sous les contrôles, touches passent', () => {
    const layer = resolveAgoraDmOverlayLayer({ containerStyle: 'full', minimized: false });
    expect(layer.hostZIndex).toBe(AGORA_DM_OVERLAY_Z_CALL_VIDEO);
    expect(layer.surfacePointerEvents).toBe('none');
  });

  it('PiP minimisé sur chat — flotte au-dessus', () => {
    const layer = resolveAgoraDmOverlayLayer({ containerStyle: 'pip', minimized: true });
    expect(layer.hostZIndex).toBe(AGORA_DM_OVERLAY_Z_PIP_FLOAT);
    expect(layer.surfacePointerEvents).toBe('auto');
  });

  it('PiP sur écran d’appel connecté — au-dessus vidéo distante', () => {
    const layer = resolveAgoraDmOverlayLayer({ containerStyle: 'pip', minimized: false });
    expect(layer.hostZIndex).toBe(AGORA_DM_OVERLAY_Z_CALL_PIP);
    expect(layer.surfacePointerEvents).toBe('auto');
  });

  it('hôte full sur écran d’appel — inset top/bottom (pas écran noir total)', () => {
    const host = resolveAgoraDmOverlayHostLayout({
      containerStyle: 'full',
      minimized: false,
      safeTop: 24,
      safeBottom: 16,
    });
    expect(host.top).toBe(24 + AGORA_DM_CALL_TOP_CHROME_DP);
    expect(host.bottom).toBe(16 + AGORA_DM_CALL_DOCK_DP);
    expect(host.left).toBe(0);
    expect(host.right).toBe(0);
  });

  it('hôte PiP flottant chat — plein écran pour positionner le PiP', () => {
    const host = resolveAgoraDmOverlayHostLayout({
      containerStyle: 'pip',
      minimized: true,
      safeTop: 0,
      safeBottom: 0,
    });
    expect(host.top).toBe(0);
    expect(host.bottom).toBe(0);
  });
});
