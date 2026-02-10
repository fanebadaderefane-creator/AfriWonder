/**
 * Tests unitaires pour address.service.ts
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('address.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    service = await import('../address.service.js');
    jest.restoreAllMocks();
  });

  it('listByUser appelle prisma.address.findMany avec bon orderBy', async () => {
    const spy = jest
      .spyOn(prisma.address, 'findMany')
      .mockResolvedValueOnce([]);

    const res = await service.listByUser('u1');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'u1' },
      })
    );
    expect(res).toEqual([]);
  });

  it('create met à jour is_default pour l’utilisateur quand is_default=true', async () => {
    const updateManySpy = jest
      .spyOn(prisma.address, 'updateMany')
      .mockResolvedValue({ count: 0 } as any);
    const createSpy = jest
      .spyOn(prisma.address, 'create')
      .mockResolvedValue({ id: 'addr1' } as any);

    const addr = await service.create('u1', {
      street: 'Rue',
      city: 'Ville',
      is_default: true,
    });

    expect(updateManySpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalled();
    expect(addr.id).toBe('addr1');
  });

  it('update lève 404 si adresse introuvable', async () => {
    jest
      .spyOn(prisma.address, 'findFirst')
      .mockResolvedValueOnce(null);

    await expect(
      service.update('addr1', 'u1', { city: 'X' })
    ).rejects.toHaveProperty('statusCode', 404);
  });

  it('remove lève 404 si adresse introuvable', async () => {
    jest
      .spyOn(prisma.address, 'findFirst')
      .mockResolvedValueOnce(null);

    await expect(
      service.remove('addr1', 'u1')
    ).rejects.toHaveProperty('statusCode', 404);
  });
});

