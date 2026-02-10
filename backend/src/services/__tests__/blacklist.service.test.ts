import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('blacklist.service', () => {
  let prisma: any;
  let mod: typeof import('../blacklist.service.js');

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    mod = await import('../blacklist.service.js');
    jest.restoreAllMocks();
  });

  it('isBlacklisted retourne false si valeur vide', async () => {
    const spy = jest.spyOn(prisma.blacklistEntry, 'findFirst').mockResolvedValue(null);

    const res1 = await mod.isBlacklisted('user', '');
    const res2 = await mod.isBlacklisted('user', '   ');

    expect(res1).toBe(false);
    expect(res2).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('isBlacklisted applique correctement le filtre d’expiration quand checkExpiry=true', async () => {
    const entry = { id: '1', type: 'user', value: 'user-1' };
    const spy = jest
      .spyOn(prisma.blacklistEntry, 'findFirst')
      .mockResolvedValueOnce(entry as any);

    const result = await mod.isBlacklisted('user', 'user-1', true);

    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      type: 'user',
      value: 'user-1',
    });
    // Doit contenir une condition OR sur expires_at
    expect(Array.isArray(arg.where.OR)).toBe(true);
    expect(arg.where.OR!.length).toBe(2);
  });

  it('isBlacklisted n’ajoute pas de condition OR quand checkExpiry=false', async () => {
    const spy = jest
      .spyOn(prisma.blacklistEntry, 'findFirst')
      .mockResolvedValueOnce(null);

    const result = await mod.isBlacklisted('user', 'user-2', false);

    expect(result).toBe(false);
    const arg = spy.mock.calls[0][0];
    expect(arg.where).toEqual({
      type: 'user',
      value: 'user-2',
    });
  });

  it('addToBlacklist crée une entrée normalisée', async () => {
    const createSpy = jest
      .spyOn(prisma.blacklistEntry, 'create')
      .mockResolvedValueOnce({ id: '1' } as any);

    await mod.addToBlacklist('ip', '  1.2.3.4  ', {
      reason: 'test',
      createdBy: 'admin-1',
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        type: 'ip',
        value: '1.2.3.4',
        reason: 'test',
        created_by: 'admin-1',
        expires_at: undefined,
      },
    });
  });

  it('checkIpBlacklisted retourne false si IP indéfinie sans requête Prisma', async () => {
    const spy = jest.spyOn(prisma.blacklistEntry, 'findFirst').mockResolvedValue(null);

    const res = await mod.checkIpBlacklisted(undefined);

    expect(res).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('checkDeviceBlacklisted retourne false si deviceId indéfini sans requête Prisma', async () => {
    const spy = jest.spyOn(prisma.blacklistEntry, 'findFirst').mockResolvedValue(null);

    const res = await mod.checkDeviceBlacklisted(undefined);

    expect(res).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

