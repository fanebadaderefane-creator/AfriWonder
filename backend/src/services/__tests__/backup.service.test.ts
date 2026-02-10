import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('backup.service', () => {
  let prisma: any;
  let mod: typeof import('../backup.service.js');

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    mod = await import('../backup.service.js');
    jest.restoreAllMocks();
  });

  it('exportCriticalData inclut par défaut usersSummary, orders et transactions', async () => {
    jest.spyOn(prisma.user, 'count').mockResolvedValueOnce(10 as any);
    jest.spyOn(prisma.sellerProfile, 'count').mockResolvedValueOnce(3 as any);
    jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([] as any);
    jest.spyOn(prisma.transaction, 'findMany').mockResolvedValueOnce([] as any);

    const res = await mod.exportCriticalData();

    expect(res.usersSummary).toEqual({ userCount: 10, sellerCount: 3 });
    expect(res.ordersCount).toBe(0);
    expect(res.transactionsCount).toBe(0);
  });
});

