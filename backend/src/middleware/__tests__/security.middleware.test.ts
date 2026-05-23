/**
 * Tests unitaires pour security.middleware.ts
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('security.middleware', () => {
  let securityService: any;
  let middleware: any;

  beforeEach(async () => {
    jest.resetModules();
    const securityMod = await import('../../services/security.service.js');
    securityService = securityMod.default;
    middleware = await import('../security.middleware.js');
    jest.restoreAllMocks();
  });

  const createMockRes = () => {
    const handlers: Record<string, Function[]> = {};
    return {
      statusCode: 200,
      headers: {} as Record<string, string>,
      on: (event: string, cb: Function) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(cb);
      },
      emit: async (event: string) => {
        for (const cb of handlers[event] || []) {
          await cb();
        }
      },
      setHeader: function (key: string, value: string) {
        this.headers[key] = value;
      },
    } as any;
  };

  it('logSecurityAction ne fait rien sans user', async () => {
    const req: any = {
      user: undefined,
      ip: '1.1.1.1',
      connection: { remoteAddress: '1.1.1.1' },
      get: () => 'UA',
      method: 'GET',
      path: '/test',
    };
    const res = createMockRes();
    const next = jest.fn();
    const spy = jest.spyOn(securityService, 'logSecurityEvent');

    await middleware.logSecurityAction('login')(req, res, next);
    await res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('bruteForceProtection renvoie 429 si IP bloquée', async () => {
    const req: any = {
      ip: '2.2.2.2',
      connection: { remoteAddress: '2.2.2.2' },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    const next = jest.fn();

    jest.spyOn(securityService, 'isIpBlocked').mockResolvedValueOnce(true);

    await middleware.bruteForceProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('checkSuspiciousActivity passe si aucun user', async () => {
    const req: any = { user: undefined };
    const res: any = {};
    const next = jest.fn();

    await middleware.checkSuspiciousActivity(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('detectIpChange ne bloque pas en cas d\'erreur', async () => {
    const req: any = {
      user: { id: 'user1' },
      ip: '3.3.3.3',
      connection: { remoteAddress: '3.3.3.3' },
    };
    const res: any = {};
    const next = jest.fn();

    // Injecter une implémentation qui échoue pour déclencher le catch
    (securityService as any).getLastSecurityLog = jest
      .fn()
      .mockRejectedValueOnce(new Error('test'));

    await middleware.detectIpChange(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

