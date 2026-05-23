import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isGoogleOAuthConfiguredForPlatform,
  resolveGoogleClientIds,
  resolveGoogleClientIdsForAuthSession,
  isFacebookOAuthConfigured,
  isAppleSignInDisabledByEnv,
  getGoogleOAuthEnv,
  getFacebookAppId,
} from './oauthEnv';

const extraHolder = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('expo-constants', () => {
  const ExecutionEnvironment = { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' };
  return {
    default: {
      get expoConfig() {
        return { extra: extraHolder.current };
      },
      executionEnvironment: ExecutionEnvironment.Bare,
    },
    ExecutionEnvironment,
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  extraHolder.current = {};
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

  it('resolveGoogleClientIdsForAuthSession replie iOS vers webClientId sur plateforme web', () => {
    const env = { web: '', ios: 'ios.apps.googleusercontent.com', android: '' };
    const r = resolveGoogleClientIdsForAuthSession('web', env);
    expect(r.webClientId).toBe('ios.apps.googleusercontent.com');
    expect(r.iosClientId).toBe('ios.apps.googleusercontent.com');
  });

  it('resolveGoogleClientIdsForAuthSession ne replie pas Android vers web', () => {
    const env = { web: '', ios: '', android: 'and.apps.googleusercontent.com' };
    const r = resolveGoogleClientIdsForAuthSession('web', env);
    expect(r.webClientId).toBeUndefined();
  });

  it('isGoogleOAuthConfiguredForPlatform exige le bon client', () => {
    const onlyIos = { web: '', ios: 'i.apps.googleusercontent.com', android: '' };
    expect(isGoogleOAuthConfiguredForPlatform('ios', onlyIos)).toBe(true);
    expect(isGoogleOAuthConfiguredForPlatform('android', onlyIos)).toBe(false);
    expect(isGoogleOAuthConfiguredForPlatform('web', onlyIos)).toBe(true);

    const onlyWeb = { web: 'w.apps.googleusercontent.com', ios: '', android: '' };
    expect(isGoogleOAuthConfiguredForPlatform('android', onlyWeb)).toBe(false);
    expect(isGoogleOAuthConfiguredForPlatform('ios', onlyWeb)).toBe(true);
    expect(isGoogleOAuthConfiguredForPlatform('web', onlyWeb)).toBe(true);

    const onlyAndroid = { web: '', ios: '', android: 'a.apps.googleusercontent.com' };
    expect(isGoogleOAuthConfiguredForPlatform('web', onlyAndroid)).toBe(false);
    expect(isGoogleOAuthConfiguredForPlatform('android', onlyAndroid)).toBe(true);

    const dupWebAsAndroid = {
      web: 'same.apps.googleusercontent.com',
      ios: '',
      android: 'same.apps.googleusercontent.com',
    };
    expect(isGoogleOAuthConfiguredForPlatform('android', dupWebAsAndroid)).toBe(false);
  });

  it('lit les IDs OAuth depuis extra.afwOAuth si process.env est vide', () => {
    extraHolder.current = {
      afwOAuth: {
        googleWebClientId: 'extra-web.apps.googleusercontent.com',
        facebookAppId: '999888',
      },
    };
    vi.stubEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
    vi.stubEnv('EXPO_PUBLIC_FACEBOOK_APP_ID', '');
    expect(getGoogleOAuthEnv().web).toContain('extra-web');
    expect(getFacebookAppId()).toBe('999888');
    expect(isFacebookOAuthConfigured()).toBe(true);
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
