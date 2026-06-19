import { describe, expect, it } from 'vitest';

import { shouldAgoraSwitchCameraOnNonce } from './agoraCallVideoBind';

describe('agoraCallVideoBind', () => {
  it('ne bascule la caméra que sur action utilisateur (nonce > 0)', () => {
    expect(shouldAgoraSwitchCameraOnNonce(0)).toBe(false);
    expect(shouldAgoraSwitchCameraOnNonce(1)).toBe(true);
  });
});
