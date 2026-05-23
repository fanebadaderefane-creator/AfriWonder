import { describe, expect, it } from 'vitest';
import { getGoogleInstalledAppRedirectUriForPlatform } from './googleInstalledAppRedirect';

describe('getGoogleInstalledAppRedirectUriForPlatform', () => {
  it('returns undefined on web', () => {
    expect(
      getGoogleInstalledAppRedirectUriForPlatform('web', {
        androidClientId: '777976865742-x.apps.googleusercontent.com',
        iosClientId: '777976865742-y.apps.googleusercontent.com',
      }),
    ).toBeUndefined();
  });

  it('derives reverse redirect from Android client id on android', () => {
    expect(
      getGoogleInstalledAppRedirectUriForPlatform('android', {
        androidClientId: '777976865742-n1ij65icbjucklt3hb6bilpc43gf2rji.apps.googleusercontent.com',
        iosClientId: '777976865742-ios.apps.googleusercontent.com',
      }),
    ).toBe('com.googleusercontent.apps.777976865742-n1ij65icbjucklt3hb6bilpc43gf2rji:/oauthredirect');
  });

  it('derives reverse redirect from iOS client id on ios', () => {
    expect(
      getGoogleInstalledAppRedirectUriForPlatform('ios', {
        androidClientId: '777976865742-android.apps.googleusercontent.com',
        iosClientId: '777976865742-adc2srg5m3omceglol1aqrcogd9rtl7e.apps.googleusercontent.com',
      }),
    ).toBe('com.googleusercontent.apps.777976865742-adc2srg5m3omceglol1aqrcogd9rtl7e:/oauthredirect');
  });

  it('returns undefined when platform client id duplicates web client id', () => {
    const same = '777976865742-web.apps.googleusercontent.com';
    expect(
      getGoogleInstalledAppRedirectUriForPlatform(
        'android',
        { androidClientId: same, iosClientId: '777-ios.apps.googleusercontent.com' },
        { webClientId: same },
      ),
    ).toBeUndefined();
    expect(
      getGoogleInstalledAppRedirectUriForPlatform(
        'ios',
        { androidClientId: '777-and.apps.googleusercontent.com', iosClientId: same },
        { webClientId: same },
      ),
    ).toBeUndefined();
  });

  it('returns undefined when skipCustomScheme is true', () => {
    expect(
      getGoogleInstalledAppRedirectUriForPlatform(
        'android',
        {
          androidClientId: '777976865742-n1ij65icbjucklt3hb6bilpc43gf2rji.apps.googleusercontent.com',
        },
        { skipCustomScheme: true },
      ),
    ).toBeUndefined();
  });
});
