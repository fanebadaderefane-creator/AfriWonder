import { describe, expect, it } from 'vitest';
import {
  AGORA_DM_PIP_TOUCH_Z_INDEX,
  AGORA_DM_TAP_REVEAL_Z_INDEX,
  resolveAgoraDmVideoFeedPlacements,
} from './agoraDmVideoLayout';

describe('resolveAgoraDmVideoFeedPlacements', () => {
  it('sonnerie — local plein écran', () => {
    expect(
      resolveAgoraDmVideoFeedPlacements({
        isVideoCall: true,
        remoteJoined: false,
        mediaEnabled: true,
        feedsSwapped: false,
      }),
    ).toEqual({ local: 'fullscreen', remote: 'hidden' });
  });

  it('connecté — distant plein, local PiP', () => {
    expect(
      resolveAgoraDmVideoFeedPlacements({
        isVideoCall: true,
        remoteJoined: true,
        mediaEnabled: true,
        feedsSwapped: false,
      }),
    ).toEqual({ local: 'pip', remote: 'fullscreen' });
  });

  it('tap PiP — inversion local/distant', () => {
    expect(
      resolveAgoraDmVideoFeedPlacements({
        isVideoCall: true,
        remoteJoined: true,
        mediaEnabled: true,
        feedsSwapped: true,
      }),
    ).toEqual({ local: 'fullscreen', remote: 'pip' });
  });

  it('remoteJoined fluctue — reste en layout connecté si remoteEverJoined', () => {
    expect(
      resolveAgoraDmVideoFeedPlacements({
        isVideoCall: true,
        remoteJoined: false,
        remoteEverJoined: true,
        mediaEnabled: true,
        feedsSwapped: false,
      }),
    ).toEqual({ local: 'pip', remote: 'fullscreen' });
  });

  it('PiP touch chrome au-dessus du tap-to-reveal (BUG 11)', () => {
    expect(AGORA_DM_PIP_TOUCH_Z_INDEX).toBeGreaterThan(AGORA_DM_TAP_REVEAL_Z_INDEX);
  });
});
