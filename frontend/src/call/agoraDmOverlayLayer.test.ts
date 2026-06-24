import { describe, expect, it } from 'vitest';
import {
  AGORA_DM_OVERLAY_Z_CALL_PIP,
  AGORA_DM_OVERLAY_Z_CALL_VIDEO,
  AGORA_DM_OVERLAY_Z_PIP_FLOAT,
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
});
