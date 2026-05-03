import { describe, expect, it } from 'vitest';
import { googleNativeReverseClientRedirectUri } from './googleNativeOAuthRedirect';

describe('googleNativeReverseClientRedirectUri', () => {
  it('builds reversed client redirect from Android-style client id', () => {
    expect(
      googleNativeReverseClientRedirectUri('777976865742-n1ij65icbjucklt3hb6bilpc43gf2rji.apps.googleusercontent.com'),
    ).toBe('com.googleusercontent.apps.777976865742-n1ij65icbjucklt3hb6bilpc43gf2rji:/oauthredirect');
  });

  it('returns null for invalid input', () => {
    expect(googleNativeReverseClientRedirectUri('')).toBeNull();
    expect(googleNativeReverseClientRedirectUri('not-a-client-id')).toBeNull();
  });
});
