import { describe, it, expect, jest } from '@jest/globals';
import {
  cachePolicyMiddleware,
  csrfProtectionMiddleware,
  sanitizeInputMiddleware,
} from '../requestProtection.middleware.js';

describe('requestProtection.middleware', () => {
  const createRes = () =>
    ({
      headers: {} as Record<string, string>,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: function (k: string, v: string) {
        this.headers[k] = v;
      },
    }) as any;

  it('sanitizeInputMiddleware removes script tags', () => {
    const req: any = {
      path: '/api/products',
      body: {
        name: 'ok',
        description: '<script>alert(1)</script>Hello',
      },
    };
    const res = createRes();
    const next = jest.fn();

    sanitizeInputMiddleware(req, res, next);

    expect(req.body.description).toBe('Hello');
    expect(next).toHaveBeenCalled();
  });

  it('sanitizeInputMiddleware skips webhook payloads', () => {
    const req: any = {
      path: '/api/payments/orange-money/webhook',
      body: { raw: '<script>x</script>' },
    };
    const res = createRes();
    const next = jest.fn();

    sanitizeInputMiddleware(req, res, next);

    expect(req.body.raw).toContain('<script>');
    expect(next).toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware blocks cookie unsafe requests with invalid origin', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';

    const req: any = {
      method: 'POST',
      path: '/api/auth/logout',
      headers: {
        cookie: 'access_token=abc',
        origin: 'http://evil.example',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware allows bearer-token requests', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.NODE_ENV = 'development';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        authorization: 'Bearer token',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('cachePolicyMiddleware sets public cache for products GET', () => {
    const req: any = { method: 'GET', path: '/api/products' };
    const res = createRes();
    const next = jest.fn();

    cachePolicyMiddleware(req, res, next);

    expect(res.headers['Cache-Control']).toContain('public');
    expect(next).toHaveBeenCalled();
  });
});

