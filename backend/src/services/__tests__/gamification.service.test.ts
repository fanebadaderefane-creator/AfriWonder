import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('gamification.service', () => {
  let prisma: any;
  let GamificationEngine: any;
  let addXp: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../gamification.service.js');
    GamificationEngine = mod.GamificationEngine;
    addXp = mod.addXp;
    jest.restoreAllMocks();
  });

  it('addXp crée le userLevel si nécessaire et augmente le XP', async () => {
    jest.spyOn(prisma.userLevel, 'findUnique').mockResolvedValueOnce(null);
    jest.spyOn(prisma.userLevel, 'create').mockResolvedValueOnce({
      user_id: 'u1',
      level: 1,
      xp: 0,
      next_level_xp: 100,
    } as any);

    const updateSpy = jest
      .spyOn(prisma.userLevel, 'update')
      .mockResolvedValueOnce({
        user_id: 'u1',
        level: 1,
        xp: 50,
        next_level_xp: 100,
      } as any);

    const res = await addXp('u1', 50, 'test');

    expect(res.level).toBe(1);
    expect(res.xp).toBe(50);
    expect(updateSpy).toHaveBeenCalled();
  });

  // On ne teste pas ici les triggers GamificationEngine pour éviter
  // d'exécuter réellement addXp avec Prisma et les contraintes de FK.
});

