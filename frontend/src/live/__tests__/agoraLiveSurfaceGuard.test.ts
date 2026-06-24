import { describe, expect, it } from 'vitest';
import {
  shouldMountAgoraLiveLocalSurface,
  shouldMountAgoraLiveRemoteSurface,
} from '../agoraLiveSurfaceGuard';

describe('shouldMountAgoraLiveLocalSurface', () => {
  it('refuse web et audience', () => {
    expect(
      shouldMountAgoraLiveLocalSurface({
        platform: 'web',
        role: 'host',
        previewReady: true,
      }),
    ).toBe(false);
    expect(
      shouldMountAgoraLiveLocalSurface({
        platform: 'android',
        role: 'audience',
        previewReady: true,
      }),
    ).toBe(false);
  });

  it('exige previewReady pour hôte natif (sans attendre join)', () => {
    expect(
      shouldMountAgoraLiveLocalSurface({
        platform: 'android',
        role: 'host',
        previewReady: false,
      }),
    ).toBe(false);
    expect(
      shouldMountAgoraLiveLocalSurface({
        platform: 'android',
        role: 'host',
        previewReady: true,
      }),
    ).toBe(true);
  });
});

describe('shouldMountAgoraLiveRemoteSurface', () => {
  it('exige join + uid distant valide', () => {
    expect(
      shouldMountAgoraLiveRemoteSurface({
        platform: 'android',
        joined: false,
        remoteUid: 42,
      }),
    ).toBe(false);
    expect(
      shouldMountAgoraLiveRemoteSurface({
        platform: 'android',
        joined: true,
        remoteUid: null,
      }),
    ).toBe(false);
    expect(
      shouldMountAgoraLiveRemoteSurface({
        platform: 'android',
        joined: true,
        remoteUid: 42,
      }),
    ).toBe(true);
  });
});
