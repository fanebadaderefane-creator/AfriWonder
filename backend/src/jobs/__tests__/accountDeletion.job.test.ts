/**
 * Tests unitaires pour jobs/accountDeletion.job.ts
 * On espionne Prisma et les services au lieu de remplacer le module database.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('accountDeletion jobs', () => {
  let prisma: any;
  let logger: any;
  let privacyService: any;
  let mod: any;

  beforeEach(async () => {
    jest.resetModules();

    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;

    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;

    const privacyMod = await import('../../services/privacy.service.js');
    privacyService = privacyMod.default;

    mod = await import('../accountDeletion.job.js');

    jest.restoreAllMocks();
  });

  it('processScheduledAccountDeletions retourne un succès vide quand aucun compte', async () => {
    const findManySpy = jest
      .spyOn(prisma.accountDeletionRequest, 'findMany')
      .mockResolvedValueOnce([]);
    const deleteSpy = jest.spyOn(privacyService, 'permanentlyDeleteAccount');

    const result = await mod.processScheduledAccountDeletions();

    expect(result).toMatchObject({
      success: true,
      deleted: 0,
    });
    expect(findManySpy).toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('processScheduledAccountDeletions supprime les comptes éligibles', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findMany')
      .mockResolvedValueOnce([
        {
          id: 'del1',
          user_id: 'user1',
          user: { username: 'user1', email: 'u1@example.com' },
        },
        {
          id: 'del2',
          user_id: 'user2',
          user: { username: 'user2', email: 'u2@example.com' },
        },
      ]);

    const deleteSpy = jest
      .spyOn(privacyService, 'permanentlyDeleteAccount')
      .mockResolvedValue(undefined as any);
    const loggerSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const result = await mod.processScheduledAccountDeletions();

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(result.deleted).toBe(2);
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('sendDeletionReminders crée des notifications pour les suppressions à venir', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findMany')
      .mockResolvedValueOnce([
        {
          id: 'del1',
          user_id: 'user1',
          cancellation_token: 'token1',
          scheduled_deletion_at: new Date(),
          user: { username: 'user1', email: 'u1@example.com', full_name: 'User 1' },
        },
      ]);

    const createSpy = jest
      .spyOn(prisma.notification, 'create')
      .mockResolvedValue({ id: 'notif1' } as any);

    const result = await mod.sendDeletionReminders();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      sent: 1,
    });
  });
});

