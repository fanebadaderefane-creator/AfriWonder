import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('privacy.service', () => {
  let prisma: any;
  let service: any;
  let securityService: any;

  beforeEach(async () => {
    jest.resetModules();

    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;

    const securityMod = await import('../security.service.js');
    securityService = securityMod.default;

    const mod = await import('../privacy.service.js');
    service = mod.default;

    jest.restoreAllMocks();
  });

  it('saveCookiePreferences upsert les préférences et log le consentement', async () => {
    const upsertSpy = jest
      .spyOn(prisma.userCookiePreference, 'upsert')
      .mockResolvedValueOnce({ user_id: 'u1' } as any);
    const consentSpy = jest
      .spyOn(prisma.consentLog, 'create')
      .mockResolvedValueOnce({ id: 'c1' } as any);

    const prefs = await service.saveCookiePreferences({
      userId: 'u1',
      essential: true,
      analytics: true,
      marketing: false,
      functional: true,
      socialMedia: false,
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });

    expect(prefs.user_id).toBe('u1');
    expect(upsertSpy).toHaveBeenCalled();
    expect(consentSpy).toHaveBeenCalled();
  });

  it('getCookiePreferences crée des valeurs par défaut si aucune préférence', async () => {
    jest
      .spyOn(prisma.userCookiePreference, 'findUnique')
      .mockResolvedValueOnce(null);

    const createSpy = jest
      .spyOn(prisma.userCookiePreference, 'create')
      .mockResolvedValueOnce({ user_id: 'u1', essential: true } as any);

    const prefs = await service.getCookiePreferences('u1');

    expect(prefs.user_id).toBe('u1');
    expect(createSpy).toHaveBeenCalled();
  });

  it('createExportRequest refuse si une demande est déjà en cours', async () => {
    jest
      .spyOn(prisma.dataExportRequest, 'findFirst')
      .mockResolvedValueOnce({ id: 'pending-1' } as any);

    await expect(
      service.createExportRequest({
        userId: 'u1',
        format: 'json',
        ipAddress: '1.2.3.4',
      }),
    ).rejects.toThrow('Vous avez déjà une demande d\'export en cours');
  });

  it('requestAccountDeletion crée une demande et log un évènement de sécurité', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findFirst')
      .mockResolvedValueOnce(null);

    jest
      .spyOn(prisma.accountDeletionRequest, 'create')
      .mockResolvedValueOnce({
        id: 'del-1',
        user_id: 'u1',
      } as any);

    const logSpy = jest
      .spyOn(securityService, 'logSecurityEvent')
      .mockResolvedValueOnce(undefined as any);

    const deletion = await service.requestAccountDeletion({
      userId: 'u1',
      reason: 'test',
      ipAddress: '1.2.3.4',
    });

    expect(deletion.cancellation_url).toContain('/api/privacy/cancel-deletion/');
    expect(logSpy).toHaveBeenCalled();
  });

  it('getSecurityLogs retourne logs + pagination', async () => {
    const logs = [{ id: 's1' }];
    jest
      .spyOn(prisma.securityLog, 'findMany')
      .mockResolvedValueOnce(logs as any);
    jest
      .spyOn(prisma.securityLog, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.getSecurityLogs('u1', 1, 10);

    expect(res.logs).toBe(logs);
    expect(res.pagination.total).toBe(1);
  });
});


