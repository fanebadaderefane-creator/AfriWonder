import { describe, expect, it } from 'vitest';

import {
  shouldReleaseAgoraPreviewSession,
  shouldRunRtcChannelTeardown,
} from './agoraRtcLifecycle';

describe('agoraRtcLifecycle — régression écran noir sonnerie', () => {
  it('sonnerie (enabled=false, pas de moteur canal) — pas de teardown RTC', () => {
    expect(
      shouldRunRtcChannelTeardown({ enabled: false, hasChannelEngine: false }),
    ).toBe(false);
  });

  it('ne libère pas le preview pendant la sonnerie seule', () => {
    expect(
      shouldReleaseAgoraPreviewSession({
        callEnded: false,
        hadChannelEngine: false,
        previewOnlyRinging: true,
      }),
    ).toBe(false);
  });

  it('fin d’appel — libère le preview', () => {
    expect(
      shouldReleaseAgoraPreviewSession({
        callEnded: true,
        hadChannelEngine: false,
        previewOnlyRinging: true,
      }),
    ).toBe(true);
  });

  it('leave canal après join — libère preview handoff', () => {
    expect(
      shouldReleaseAgoraPreviewSession({
        callEnded: false,
        hadChannelEngine: true,
        previewOnlyRinging: false,
      }),
    ).toBe(true);
  });
});
