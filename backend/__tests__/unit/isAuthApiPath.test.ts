import { describe, it, expect } from '@jest/globals';
import { isAuthApiPath } from '../../src/middleware/requestProtection.middleware.js';

describe('isAuthApiPath', () => {
  it('couvre les préfixes historiques et les segments auth avec préfixe versionné', () => {
    expect(isAuthApiPath('/api/proxy/auth/register')).toBe(true);
    expect(isAuthApiPath('/api/v1/proxy/auth/register')).toBe(true);
    expect(isAuthApiPath('/api/proxy/auth/future-endpoint')).toBe(true);
    expect(isAuthApiPath('https://api.example.com/api/proxy/auth/login')).toBe(true);
  });

  it('ne confond pas le segment "authors" ni d’autres chemins hors auth', () => {
    expect(isAuthApiPath('/api/authors')).toBe(false);
    expect(isAuthApiPath('/api/authors/feed')).toBe(false);
    expect(isAuthApiPath('/api/orders')).toBe(false);
  });
});
