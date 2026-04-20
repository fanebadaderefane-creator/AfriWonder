import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isGoogleOAuthConfiguredForPlatform,
  resolveGoogleClientIds,
  isFacebookOAuthConfigured,
  isAppleSignInDisabledByEnv,
} from './oauthEnv';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('oauthEnv', () => {
  it('resolveGoogleClientIds replie web vers iOS seulement (Android exige un client natif)', () => {
    expect(
      resolveGoogleClientIds({
        web: 'web.apps.googleusercontent.com',
        ios: '',
        android: '',
      }),
    ).toEqual({
      webClientId: 'web.apps.googleusercontent.com',
      iosClientId: 'web.apps.googleusercontent.com',
      androidClientId: undefined,
    });
    expect(
      resolveGoogleClientIds({
        web: '',
        ios: 'ios-only.apps.googleusercontent.com',
        android: '',
      }),
    ).toEqual({
      webClientId: undefined,
      iosClientId: 'ios-only.apps.googleusercontent.com',
      androidClientId: undefined,
    });
  });

  it('isGoogleOAuthConfiguredForPlatform exige le bon client', () => {
    const onlyIos = { web: '', ios: 'i.apps.googleusercontent.com', android: '' };
    expect(isGoogleOAuthConfiguredForPlatform('ios', onlyIos)).toBe(true);
    expect(isGoogleOAuthConfiguredForPlatform('android', onlyIos)).toBe(false);

    const onlyWeb = { web: 'w.apps.googleusercontent.com', ios: '', android: '' };
    expect(isGoogleOAuthConfiguredForPlatform('android', onlyWeb)).toBe(false);
    expect(isGoogleOAuthConfiguredForPlatform('ios', onlyWeb)).toBe(true);
  });

  it('isFacebookOAuthConfigured', () => {
    expect(isFacebookOAuthConfigured()).toBe(false);
    vi.stubEnv('EXPO_PUBLIC_FACEBOOK_APP_ID', '123456');
    expect(isFacebookOAuthConfigured()).toBe(true);
  });

  it('isAppleSignInDisabledByEnv', () => {
    expect(isAppleSignInDisabledByEnv()).toBe(false);
    vi.stubEnv('EXPO_PUBLIC_APPLE_SIGN_IN', 'off');
    expect(isAppleSignInDisabledByEnv()).toBe(true);
  });
});
