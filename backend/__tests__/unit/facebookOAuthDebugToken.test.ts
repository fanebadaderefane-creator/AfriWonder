import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fetchFacebookUserFromAccessToken } from '../../src/services/oauthMobileVerify.service.js';

describe('fetchFacebookUserFromAccessToken + debug_token', () => {
  const origFetch = global.fetch;
  const prevEnv = {
    id: process.env.FACEBOOK_APP_ID,
    secret: process.env.FACEBOOK_APP_SECRET,
    nodeEnv: process.env.NODE_ENV,
  };

  beforeEach(() => {
    process.env.FACEBOOK_APP_ID = '123456789';
    process.env.FACEBOOK_APP_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    global.fetch = origFetch;
    if (prevEnv.id !== undefined) process.env.FACEBOOK_APP_ID = prevEnv.id;
    else delete process.env.FACEBOOK_APP_ID;
    if (prevEnv.secret !== undefined) process.env.FACEBOOK_APP_SECRET = prevEnv.secret;
    else delete process.env.FACEBOOK_APP_SECRET;
    if (prevEnv.nodeEnv !== undefined) process.env.NODE_ENV = prevEnv.nodeEnv;
  });

  it('appelle debug_token puis /me quand id + secret sont définis', async () => {
    const fetchMock = jest.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { is_valid: true, app_id: '123456789' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fbuid1',
          email: 'fb@example.com',
          name: 'Test User',
          picture: { data: { url: 'https://example.com/p.jpg' } },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const profile = await fetchFacebookUserFromAccessToken('user-access-token');

    expect(profile.id).toBe('fbuid1');
    expect(profile.email).toBe('fb@example.com');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0] || '')).toContain('debug_token');
    expect(String(fetchMock.mock.calls[1]?.[0] || '')).toContain('/me');
  });

  it('rejette si debug_token indique app_id différent', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { is_valid: true, app_id: '999' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchFacebookUserFromAccessToken('tok')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
