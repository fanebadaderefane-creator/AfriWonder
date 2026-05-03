import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { resolveGoogleOAuthAudiences } from '../../src/services/oauthMobileVerify.service.js';

describe('resolveGoogleOAuthAudiences', () => {
  const prev = { audiences: process.env.GOOGLE_OAUTH_AUDIENCES, clientId: process.env.GOOGLE_CLIENT_ID };

  beforeEach(() => {
    delete process.env.GOOGLE_OAUTH_AUDIENCES;
    delete process.env.GOOGLE_CLIENT_ID;
  });

  afterEach(() => {
    if (prev.audiences !== undefined) process.env.GOOGLE_OAUTH_AUDIENCES = prev.audiences;
    else delete process.env.GOOGLE_OAUTH_AUDIENCES;
    if (prev.clientId !== undefined) process.env.GOOGLE_CLIENT_ID = prev.clientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  });

  it('utilise GOOGLE_OAUTH_AUDIENCES quand défini', () => {
    process.env.GOOGLE_OAUTH_AUDIENCES = 'a.apps.googleusercontent.com, b.apps.googleusercontent.com';
    expect(resolveGoogleOAuthAudiences()).toEqual([
      'a.apps.googleusercontent.com',
      'b.apps.googleusercontent.com',
    ]);
  });

  it('retombe sur GOOGLE_CLIENT_ID', () => {
    process.env.GOOGLE_CLIENT_ID = 'webonly.apps.googleusercontent.com';
    expect(resolveGoogleOAuthAudiences()).toEqual(['webonly.apps.googleusercontent.com']);
  });
});
