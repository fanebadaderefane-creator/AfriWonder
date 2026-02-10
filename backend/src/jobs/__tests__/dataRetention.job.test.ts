/**
 * Tests unitaires pour jobs/dataRetention.job.ts
 * On utilise Prisma réel mais avec des espions sur les méthodes.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('dataRetention jobs', () => {
  let prisma: any;
  let logger: any;
  let mod: any;

  beforeEach(async () => {
    jest.resetModules();

    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;

    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;

    mod = await import('../dataRetention.job.js');

    jest.restoreAllMocks();
  });

  it('initializeRetentionPolicies upsert toutes les politiques par défaut', async () => {
    const upsertSpy = jest
      .spyOn(prisma.dataRetentionPolicy, 'upsert')
      .mockResolvedValue({ id: 'policy' } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    await mod.initializeRetentionPolicies();

    expect(upsertSpy).toHaveBeenCalled();
    expect(upsertSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(infoSpy).toHaveBeenCalled();
  });

  it('applyRetentionPolicies ne fait rien quand aucune politique active', async () => {
    jest
      .spyOn(prisma.dataRetentionPolicy, 'findMany')
      .mockResolvedValueOnce([]);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const result = await mod.applyRetentionPolicies();

    expect(result).toMatchObject({
      success: true,
      cleaned: 0,
    });
    expect(infoSpy).toHaveBeenCalledWith('✅ Aucune politique de rétention active');
  });

  it('applyRetentionPolicies applique les politiques connues et met à jour last_cleanup_at', async () => {
    jest
      .spyOn(prisma.dataRetentionPolicy, 'findMany')
      .mockResolvedValueOnce([
        { id: 'p1', data_type: 'security_logs', retention_days: 10 },
        { id: 'p2', data_type: 'notifications', retention_days: 5 },
        { id: 'p3', data_type: 'notification_logs', retention_days: 3 },
        { id: 'p4', data_type: 'guest_cookie_consents', retention_days: 20 },
        { id: 'p5', data_type: 'data_export_requests', retention_days: 30 },
        { id: 'p6', data_type: 'suspicious_activity_alerts', retention_days: 60 },
        { id: 'p7', data_type: 'unknown_type', retention_days: 1 },
      ]);

    jest
      .spyOn(prisma.securityLog, 'deleteMany')
      .mockResolvedValue({ count: 5 } as any);
    jest
      .spyOn(prisma.notification, 'deleteMany')
      .mockResolvedValue({ count: 3 } as any);
    jest
      .spyOn(prisma.notificationLog, 'deleteMany')
      .mockResolvedValue({ count: 2 } as any);
    jest
      .spyOn(prisma.guestCookieConsent, 'deleteMany')
      .mockResolvedValue({ count: 1 } as any);
    jest
      .spyOn(prisma.dataExportRequest, 'deleteMany')
      .mockResolvedValue({ count: 4 } as any);
    jest
      .spyOn(prisma.suspiciousActivityAlert, 'deleteMany')
      .mockResolvedValue({ count: 6 } as any);

    const updateSpy = jest
      .spyOn(prisma.dataRetentionPolicy, 'update')
      .mockResolvedValue({} as any);

    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const result = await mod.applyRetentionPolicies();

    expect(result.success).toBe(true);
    expect(result.cleaned).toBeGreaterThan(0);
    expect(updateSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Type de données non géré'));
  });
});

