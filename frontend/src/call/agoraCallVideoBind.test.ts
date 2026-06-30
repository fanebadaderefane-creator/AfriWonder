import { describe, expect, it } from 'vitest';

import { shouldAgoraDmSkipSetupLocalVideo, shouldAgoraSwitchCameraOnNonce } from './agoraCallVideoBind';

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
});
