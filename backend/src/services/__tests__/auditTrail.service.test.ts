import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('auditTrail.service', () => {
  let prisma: any;
  let mod: typeof import('../auditTrail.service.js');

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    mod = await import('../auditTrail.service.js');
    jest.restoreAllMocks();
  });

  it('logAuditEvent crée un auditEvent', async () => {
    const createSpy = jest
      .spyOn(prisma.auditEvent, 'create')
      .mockResolvedValueOnce({ id: 'a1' } as any);

    await mod.logAuditEvent({
      event_type: 'user_login',
      actor_id: 'u1',
      target_type: 'user',
      target_id: 'u1',
      payload: { success: true },
      ip_address: '1.2.3.4',
      user_agent: 'jest',
    });

    expect(createSpy).toHaveBeenCalled();
  });

  it('auditFromRequest construit correctement les infos depuis la requête', async () => {
    const spy = jest
      .spyOn(prisma.auditEvent, 'create')
      .mockResolvedValueOnce({ id: 'a2' } as any);

    const req = {
      user: { id: 'u1' },
      headers: {
        'x-forwarded-for': '5.6.7.8, 1.2.3.4',
        'user-agent': 'jest',
      } as any,
      socket: { remoteAddress: '9.9.9.9' },
    };

    await mod.auditFromRequest(req as any, 'test_event', 'user', 'u1', { foo: 'bar' });

    expect(spy).toHaveBeenCalled();
    const data = spy.mock.calls[0][0].data;
    expect(data.actor_id).toBe('u1');
    expect(data.ip_address).toBe('5.6.7.8');
    expect(data.user_agent).toBe('jest');
  });
});

