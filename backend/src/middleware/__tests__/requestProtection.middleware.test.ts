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

  it('sanitizeInputMiddleware does not alter password strings (avoid false bcrypt mismatch)', () => {
    const tricky =
      'LegitPass1 onclick=x-javascript:void(0) on2fa=stillpart';
    const req: any = {
      path: '/api/auth/login',
      body: {
        identifier: 'user@example.com',
        password: tricky,
      },
    };
    const res = createRes();
    const next = jest.fn();

    sanitizeInputMiddleware(req, res, next);

    expect(req.body.password).toBe(tricky);
    expect(next).toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware blocks cookie unsafe requests with invalid origin', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.APP_URL = 'http://localhost:3000';
    // CSRF n’est pas appliqué sur les chemins /api/auth/* (voir isAuthApiPath) ; tester une route API hors auth.
    process.env.NODE_ENV = 'development';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
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

  it('csrfProtectionMiddleware allows Expo Web localhost origin in development (cookie + no bearer)', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'some_session=1',
        origin: 'http://localhost:8081',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware still blocks unknown localhost in production', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'some_session=1',
        origin: 'http://localhost:8081',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware allows cookie requests without Origin/Referer (React Native / APK)', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'some_session=1',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware allows cookie + capacitor:// origin in production (APK / hybrid)', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'some_session=1',
        origin: 'capacitor://localhost',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware allows cookie + exp:// origin in production (Expo)', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'some_session=1',
        origin: 'exp://192.168.1.5:8081',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware skips CSRF for login when path only on originalUrl', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/',
      originalUrl: '/api/proxy/auth/login',
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

  it('csrfProtectionMiddleware skips CSRF for /proxy/auth/login without /api prefix', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/proxy/auth/login',
      originalUrl: '/proxy/auth/login',
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

  it('csrfProtectionMiddleware allows cookie when Origin host matches API Host (Android / OkHttp)', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://app.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/cart',
      headers: {
        cookie: 'some_session=1',
        origin: 'https://afriwonder.onrender.com',
      },
      get: (name: string) => (String(name).toLowerCase() === 'host' ? 'afriwonder.onrender.com' : ''),
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('csrfProtectionMiddleware allows cookie + invalid origin when X-AFW-Device-Id is set (APK)', () => {
    process.env.CORS_ORIGIN = 'https://app.afriwonder.com';
    process.env.APP_URL = 'https://api.afriwonder.com';
    process.env.NODE_ENV = 'production';

    const req: any = {
      method: 'POST',
      path: '/api/orders',
      headers: {
        cookie: 'access_token=abc',
        origin: 'http://localhost:8081',
        'x-afw-device-id': 'expo-install-id-12345678',
      },
    };
    const res = createRes();
    const next = jest.fn();

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
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

