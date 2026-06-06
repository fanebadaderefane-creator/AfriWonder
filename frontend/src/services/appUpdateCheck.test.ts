import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOFT_UPDATE_MESSAGE,
  evaluateAppUpdate,
  resolvePlatformPolicy,
  resolveUpdateMessage,
  shouldUsePlayInAppUpdate,
} from './appUpdateCheck';

describe('appUpdateCheck', () => {
  const policy = {
    min_version_code: 20,
    latest_version_code: 25,
    store_url: 'https://play.google.com/store/apps/details?id=com.afriwonder.app',
  };

  it('force update when below minimum', () => {
    expect(evaluateAppUpdate('android', 19, policy).kind).toBe('force');
  });

  it('soft update when below latest but above min', () => {
    expect(evaluateAppUpdate('android', 22, policy).kind).toBe('soft');
  });

  it('no update when up to date', () => {
    expect(evaluateAppUpdate('android', 25, policy).kind).toBe('none');
  });

  it('no update when server latest unset', () => {
    expect(evaluateAppUpdate('android', 10, null).kind).toBe('none');
    expect(
      resolvePlatformPolicy({ android: { ...policy, latest_version_code: 0 }, ios: policy }, 'android'),
    ).toBeNull();
  });

  it('resolveUpdateMessage uses server copy when provided', () => {
    expect(resolveUpdateMessage('soft', { ...policy, update_message: 'Custom soft' })).toBe('Custom soft');
    expect(resolveUpdateMessage('force', null)).not.toBe(DEFAULT_SOFT_UPDATE_MESSAGE);
  });

  it('shouldUsePlayInAppUpdate defaults true on Android', () => {
    expect(shouldUsePlayInAppUpdate('android', policy)).toBe(true);
    expect(shouldUsePlayInAppUpdate('android', { ...policy, use_play_in_app_update: false })).toBe(
      false,
    );
    expect(shouldUsePlayInAppUpdate('ios', policy)).toBe(false);
  });
});
