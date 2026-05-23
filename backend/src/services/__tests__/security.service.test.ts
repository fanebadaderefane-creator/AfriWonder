import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('security.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../security.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('logSecurityEvent crée un log avec risk_score calculé et déclenche l’analyse', async () => {
    const createSpy = jest
      .spyOn(prisma.securityLog, 'create')
      .mockResolvedValueOnce({ id: 'log-1' } as any);

    const analyzeSpy = jest
      .spyOn(service, 'analyzeForSuspiciousActivity')
      .mockResolvedValueOnce(undefined as any);

    const event = {
      userId: 'u1',
      action: 'login_failed',
      status: 'failed' as const,
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
      deviceInfo: { os: 'test' },
      metadata: { test: true },
    };

    const res = await service.logSecurityEvent(event);

    expect(res.id).toBe('log-1');
    expect(createSpy).toHaveBeenCalledTimes(1);
    const arg = createSpy.mock.calls[0][0];
    expect(arg.data.user_id).toBe('u1');
    expect(arg.data.action).toBe('login_failed');
    expect(typeof arg.data.risk_score).toBe('number');
    expect(analyzeSpy).toHaveBeenCalledWith('u1', event);
  });

  it('isIpBlocked retourne true si le nombre de tentatives échouées >= 10', async () => {
    const countSpy = jest
      .spyOn(prisma.securityLog, 'count')
      .mockResolvedValueOnce(9 as any)
      .mockResolvedValueOnce(10 as any);

    const ip = '1.2.3.4';
    const notBlocked = await service.isIpBlocked(ip);
    const blocked = await service.isIpBlocked(ip);

    expect(notBlocked).toBe(false);
    expect(blocked).toBe(true);
    expect(countSpy).toHaveBeenCalledTimes(2);
  });

  it('getRemainingLoginAttempts retourne 10 - échecs (min 0)', async () => {
    const countSpy = jest
      .spyOn(prisma.securityLog, 'count')
      .mockResolvedValueOnce(3 as any)
      .mockResolvedValueOnce(15 as any);

    const ip = '1.2.3.4';
    const remaining1 = await service.getRemainingLoginAttempts(ip);
    const remaining2 = await service.getRemainingLoginAttempts(ip);

    expect(remaining1).toBe(7);
    expect(remaining2).toBe(0);
    expect(countSpy).toHaveBeenCalledTimes(2);
  });

  it('createSuspiciousActivityAlert ne crée pas de doublon si une alerte récente existe', async () => {
    const findSpy = jest
      .spyOn(prisma.suspiciousActivityAlert, 'findFirst')
      .mockResolvedValueOnce({ id: 'alert-existing' } as any);

    const createSpy = jest
      .spyOn(prisma.suspiciousActivityAlert, 'create')
      .mockResolvedValueOnce({ id: 'alert-new' } as any);

    const res = await service.createSuspiciousActivityAlert({
      userId: 'u1',
      alertType: 'multiple_failed_logins',
      severity: 'high',
      description: 'Test',
    });

    expect(res.id).toBe('alert-existing');
    expect(findSpy).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('createSuspiciousActivityAlert crée une alerte et notifie pour sévérité élevée', async () => {
    jest
      .spyOn(prisma.suspiciousActivityAlert, 'findFirst')
      .mockResolvedValueOnce(null);

    const createSpy = jest
      .spyOn(prisma.suspiciousActivityAlert, 'create')
      .mockResolvedValueOnce({ id: 'alert-new', alert_type: 'new_location', severity: 'high' } as any);

    const notifySpy = jest
      .spyOn<any, any>(service as any, 'notifyUserOfSuspiciousActivity')
      .mockResolvedValueOnce(undefined);

    const res = await service.createSuspiciousActivityAlert({
      userId: 'u1',
      alertType: 'new_location',
      severity: 'high',
      description: 'Connexion depuis nouvelle IP',
    });

    expect(res.id).toBe('alert-new');
    expect(createSpy).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalled();
  });

  it('logAdminAction écrit un adminAuditLog avec les champs fournis', async () => {
    const createSpy = jest
      .spyOn(prisma.adminAuditLog, 'create')
      .mockResolvedValueOnce({ id: 'log-1' } as any);

    const res = await service.logAdminAction({
      adminId: 'admin-1',
      action: 'user_ban',
      entityType: 'user',
      entityId: 'u1',
      changes: { banned: true },
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });

    expect(res.id).toBe('log-1');
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        admin_id: 'admin-1',
        action: 'user_ban',
        entity_type: 'user',
        entity_id: 'u1',
        changes: { banned: true },
        ip_address: '1.2.3.4',
        user_agent: 'jest',
      },
    });
  });

  it('getAdminAuditLogs renvoie logs + pagination', async () => {
    const logs = [{ id: 'log-1' }];
    const findSpy = jest
      .spyOn(prisma.adminAuditLog, 'findMany')
      .mockResolvedValueOnce(logs as any);

    const countSpy = jest
      .spyOn(prisma.adminAuditLog, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.getAdminAuditLogs(1, 10);

    expect(res.logs).toBe(logs);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });
});

