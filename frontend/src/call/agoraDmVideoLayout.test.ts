import { describe, expect, it } from 'vitest';
import { resolveAgoraDmVideoFeedPlacements } from './agoraDmVideoLayout';

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
});
