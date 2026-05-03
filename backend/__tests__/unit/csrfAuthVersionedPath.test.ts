import { describe, it, expect, jest } from '@jest/globals';
import { csrfProtectionMiddleware } from '../../src/middleware/requestProtection.middleware.js';

describe('csrfProtectionMiddleware (auth paths, unit)', () => {
  const createRes = () =>
    ({
      headers: {} as Record<string, string>,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: function (k: string, v: string) {
        this.headers[k] = v;
      },
    }) as any;

  it('skips CSRF when URL contains /auth/register after a versioned API prefix', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/v1/proxy/auth/register',
      originalUrl: '/api/v1/proxy/auth/register',
      headers: {
        cookie: 'sid=1',
        origin: 'https://evil.example',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('n’exempte pas /api/authors : cookie + Origin invalide → 403', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/authors',
      originalUrl: '/api/authors',
      headers: {
        cookie: 'sid=1',
        origin: 'https://evil.example',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
