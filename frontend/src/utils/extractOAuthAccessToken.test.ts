import { describe, expect, it } from 'vitest';
import { extractGoogleOAuthTokens, extractOAuthAccessToken } from './extractOAuthAccessToken';

describe('extractOAuthAccessToken (Facebook / fragment)', () => {
  it('lit access_token depuis fb…://authorize#… (retour mobile Meta)', () => {
    const url = 'fb123456789:/authorize#access_token=FBTOKEN&expires_in=5000';
    expect(
      extractOAuthAccessToken({
        type: 'success',
        url,
        authentication: null,
        error: null,
        params: {},
        errorCode: null,
      } as any),
    ).toBe('FBTOKEN');
  });
});

describe('extractGoogleOAuthTokens', () => {
  it('lit access_token et id_token depuis le fragment URL', () => {
    const url =
      'com.googleusercontent.apps.abc:/oauthredirect#access_token=atokenya&id_token=idtokya&token_type=Bearer';
    const r = extractGoogleOAuthTokens({
      type: 'success',
      url,
      authentication: null,
      error: null,
      params: {},
      errorCode: null,
    } as any);
    expect(r.accessToken).toBe('atokenya');
    expect(r.idToken).toBe('idtokya');
  });

  it('préfère authentication quand présent', () => {
    const r = extractGoogleOAuthTokens({
      type: 'success',
      url: 'x:/y',
      authentication: { accessToken: 'from-auth', idToken: 'id-from-auth' },
      error: null,
      params: {},
      errorCode: null,
    } as any);
    expect(r.accessToken).toBe('from-auth');
    expect(r.idToken).toBe('id-from-auth');
  });
});
