/**
 * Tests dédiés pour atteindre 100 % de couverture sur les fichiers
 * inclus dans collectCoverageFrom (swagger, errorHandler, commissions, cloudflare-r2).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Coverage 100% - fichiers ciblés', () => {
  describe('swagger.ts', () => {
    it('utilise URL par défaut quand APP_URL absent', async () => {
      const orig = process.env.APP_URL;
      delete process.env.APP_URL;
      jest.resetModules();
      const { swaggerSpec } = await import('../src/swagger.js');
      expect(swaggerSpec.servers[0].url).toBe('http://localhost:3000');
      process.env.APP_URL = orig;
      jest.resetModules();
    });

    it('utilise APP_URL quand défini', async () => {
      const orig = process.env.APP_URL;
      process.env.APP_URL = 'https://api.test.example.com';
      jest.resetModules();
      const { swaggerSpec } = await import('../src/swagger.js');
      expect(swaggerSpec.servers[0].url).toBe('https://api.test.example.com');
      process.env.APP_URL = orig;
      jest.resetModules();
    });
  });

  describe('errorHandler', () => {
    let origNodeEnv: string | undefined;

    beforeEach(() => {
      origNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = origNodeEnv;
      jest.restoreAllMocks();
    });

    it('inclut stack en development', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { errorHandler } = await import('../src/middleware/errorHandler.js');
      const req = { path: '/test', method: 'GET' } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      const err = new Error('Test development stack') as any;
      err.stack = 'Error: Test\n  at fake (file:1:1)';
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Test development stack',
            stack: expect.any(String),
          }),
        })
      );
    });

    it('utilise statusCode et message par défaut si absents', async () => {
      jest.resetModules();
      const { errorHandler } = await import('../src/middleware/errorHandler.js');
      const req = { path: '/t', method: 'POST' } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      const err = {} as any;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ message: 'Internal Server Error' }),
        })
      );
    });

    it('passe userId au captureError quand req.user est présent', async () => {
      jest.resetModules();
      const { errorHandler } = await import('../src/middleware/errorHandler.js');
      const req = { path: '/test', method: 'GET', user: { id: 'user-123' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      const err = new Error('Test') as any;
      err.statusCode = 400;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('gère le rejet de captureError sans crasher', async () => {
      jest.unstable_mockModule('../src/services/errorMonitoring.service.js', () => ({
        captureError: jest.fn().mockRejectedValue(new Error('mock reject')),
        getErrorsSummary: jest.fn().mockReturnValue({ total: 0 }),
      }));
      jest.resetModules();
      const { errorHandler } = await import('../src/middleware/errorHandler.js');
      const req = { path: '/test', method: 'GET' } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      const err = new Error('Test error') as any;
      err.statusCode = 500;
      errorHandler(err, req, res, next);
      await new Promise((r) => setImmediate(r));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('config/commissions.ts', () => {
    it('exporte les taux marketplace', async () => {
      const { COMMISSION_VERTICALS } = await import('../src/config/commissions.js');
      expect(COMMISSION_VERTICALS.marketplace.seller_commission_default_pct).toBe(0.1);
      expect(COMMISSION_VERTICALS.video_social.tips_platform_pct).toBe(0.30);
    });
  });

  describe('config/cloudflare-r2.ts', () => {
    it('r2Client null sans variables R2 et valeurs par défaut pour bucket/URL', async () => {
      const orig = {
        R2_ENDPOINT: process.env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
        R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
      };
      delete process.env.R2_ENDPOINT;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_URL;
      jest.resetModules();
      const mod = await import('../src/config/cloudflare-r2.js');
      expect(mod.r2Client).toBeNull();
      expect(mod.R2_BUCKET_NAME).toBe('afriwonder');
      expect(mod.R2_PUBLIC_URL).toBe('');
      process.env.R2_ENDPOINT = orig.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = orig.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = orig.R2_SECRET_ACCESS_KEY;
      if (orig.R2_BUCKET_NAME !== undefined) process.env.R2_BUCKET_NAME = orig.R2_BUCKET_NAME;
      if (orig.R2_PUBLIC_URL !== undefined) process.env.R2_PUBLIC_URL = orig.R2_PUBLIC_URL;
      jest.resetModules();
    });

    it('r2Client null quand une seule variable R2 manque', async () => {
      const orig = {
        R2_ENDPOINT: process.env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      };
      process.env.R2_ENDPOINT = 'https://x.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'key';
      delete process.env.R2_SECRET_ACCESS_KEY;
      jest.resetModules();
      const mod = await import('../src/config/cloudflare-r2.js');
      expect(mod.r2Client).toBeNull();
      process.env.R2_ENDPOINT = orig.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = orig.R2_ACCESS_KEY_ID;
      if (orig.R2_SECRET_ACCESS_KEY !== undefined) process.env.R2_SECRET_ACCESS_KEY = orig.R2_SECRET_ACCESS_KEY;
      jest.resetModules();
    });

    it('r2Client créé quand R2_* sont définis', async () => {
      const orig = {
        R2_ENDPOINT: process.env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      };
      process.env.R2_ENDPOINT = 'https://x.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      jest.resetModules();
      const mod = await import('../src/config/cloudflare-r2.js');
      expect(mod.r2Client).not.toBeNull();
      process.env.R2_ENDPOINT = orig.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = orig.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = orig.R2_SECRET_ACCESS_KEY;
      jest.resetModules();
    });

    it('R2_BUCKET_NAME utilise la valeur env quand définie', async () => {
      const orig = process.env.R2_BUCKET_NAME;
      process.env.R2_BUCKET_NAME = 'custom-bucket';
      jest.resetModules();
      const mod = await import('../src/config/cloudflare-r2.js');
      expect(mod.R2_BUCKET_NAME).toBe('custom-bucket');
      process.env.R2_BUCKET_NAME = orig;
      jest.resetModules();
    });

    it('R2_PUBLIC_URL utilise la valeur env quand définie', async () => {
      const orig = process.env.R2_PUBLIC_URL;
      process.env.R2_PUBLIC_URL = 'https://cdn.test.com';
      jest.resetModules();
      const mod = await import('../src/config/cloudflare-r2.js');
      expect(mod.R2_PUBLIC_URL).toBe('https://cdn.test.com');
      process.env.R2_PUBLIC_URL = orig;
      jest.resetModules();
    });
  });
});
