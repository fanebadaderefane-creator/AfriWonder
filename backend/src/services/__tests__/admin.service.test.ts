import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('admin.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../admin.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getDashboard agrège les stats et les listes récentes', async () => {
    jest.spyOn(prisma.user, 'count').mockResolvedValueOnce(10 as any);
    jest.spyOn(prisma.video, 'count').mockResolvedValueOnce(5 as any);
    jest.spyOn(prisma.product, 'count').mockResolvedValueOnce(3 as any);
    jest.spyOn(prisma.order, 'count').mockResolvedValueOnce(2 as any);
    jest.spyOn(prisma.order, 'aggregate').mockResolvedValueOnce({
      _sum: { total_amount: 1000 },
    } as any);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValueOnce([] as any);
    jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([] as any);

    const dash = await service.getDashboard();

    expect(dash.stats.totalUsers).toBe(10);
    expect(dash.stats.totalRevenue).toBe(1000);
    expect(dash.stats.productionReadiness).toBe(100);
    expect(Array.isArray(dash.recentUsers)).toBe(true);
    expect(Array.isArray(dash.recentOrders)).toBe(true);
  });

  it('getUsers retourne la liste paginée', async () => {
    const users = [{ id: 'u1' }];
    jest.spyOn(prisma.user, 'findMany').mockResolvedValueOnce(users as any);
    jest.spyOn(prisma.user, 'count').mockResolvedValueOnce(1 as any);

    const res = await service.getUsers(1, 10);

    expect(res.users).toBe(users);
    expect(res.pagination.total).toBe(1);
  });

  it('getSellers applique les filtres status et search', async () => {
    const sellers = [{ id: 's1' }];
    const findSpy = jest
      .spyOn(prisma.sellerProfile, 'findMany')
      .mockResolvedValueOnce(sellers as any);
    jest
      .spyOn(prisma.sellerProfile, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.getSellers(1, 10, 'active', 'store');

    expect(res.sellers).toBe(sellers);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
  });

  it('getStrategicAnalytics calcule growthRate, ARPU, etc.', async () => {
    jest.spyOn(prisma.user, 'count')
      .mockResolvedValueOnce(100 as any) // totalUsers
      .mockResolvedValueOnce(20 as any)  // newUsersLast7d
      .mockResolvedValueOnce(10 as any)  // newUsersPrev7d
      .mockResolvedValueOnce(5 as any);  // newUsersLast24h

    jest.spyOn(prisma.order, 'count')
      .mockResolvedValueOnce(50 as any)  // ordersCompleted
      .mockResolvedValueOnce(80 as any); // ordersTotal

    jest.spyOn(prisma.order, 'aggregate')
      .mockResolvedValueOnce({ _sum: { total_amount: 2000 } } as any) // revenueLast30d
      .mockResolvedValueOnce({ _sum: { total_amount: 1000 } } as any); // revenuePrev30d

    jest.spyOn(prisma.transaction, 'count')
      .mockResolvedValueOnce(30 as any); // txCountLast24h

    const analytics = await service.getStrategicAnalytics({});

    expect(analytics.revenueLast30d).toBe(2000);
    expect(analytics.transactionsLast24h).toBe(30);
    expect(analytics.arpu).toBeGreaterThan(0);
    expect(analytics.growthRate).toBeGreaterThan(0);
  });
});

