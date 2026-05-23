/**
 * Tests unitaires pour AccountDeletionService
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('AccountDeletionService', () => {
  let prisma: any;
  let logger: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;
    const mod = await import('../accountDeletion.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('createDeletionRequest crée une demande si aucune en cours', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findFirst')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.accountDeletionRequest, 'create')
      .mockResolvedValueOnce({ id: 'req1', user_id: 'u1' } as any);
    jest
      .spyOn(prisma.user, 'update')
      .mockResolvedValueOnce({ id: 'u1' } as any);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const req = await service.createDeletionRequest('u1', 'test', '1.1.1.1');

    expect(req.id).toBe('req1');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('createDeletionRequest lève une erreur si demande déjà en cours', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findFirst')
      .mockResolvedValueOnce({ id: 'existing' } as any);

    await expect(
      service.createDeletionRequest('u1')
    ).rejects.toThrow('Une demande de suppression est déjà en cours');
  });

  it('cancelDeletionRequest lève une erreur si token inconnu', async () => {
    jest
      .spyOn(prisma.accountDeletionRequest, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(
      service.cancelDeletionRequest('token')
    ).rejects.toThrow('Demande de suppression non trouvée');
  });

  it('getDeletionRequestStatus renvoie la demande la plus récente', async () => {
    const spy = jest
      .spyOn(prisma.accountDeletionRequest, 'findFirst')
      .mockResolvedValueOnce({ id: 'req1' } as any);

    const res = await service.getDeletionRequestStatus('u1');

    expect(spy).toHaveBeenCalled();
    expect(res?.id).toBe('req1');
  });
});

