import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('platformRevenue.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../platformRevenue.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getPlatformWallet délègue au ledger service', async () => {
    const ledgerMod = await import('../ledger.service.js');
    const ledger = ledgerMod.default;

    const walletMock = { id: 'w1', balance: 1000 };
    const spy = jest
      .spyOn(ledger, 'getOrCreateUserWallet')
      .mockResolvedValueOnce(walletMock as any);

    const wallet = await service.getPlatformWallet();

    expect(wallet).toBe(walletMock);
    expect(spy).toHaveBeenCalled();
  });

  it('addRevenue crédite le wallet et crée une transaction', async () => {
    const ledgerMod = await import('../ledger.service.js');
    const ledger = ledgerMod.default;

    jest
      .spyOn(ledger, 'getOrCreateUserWallet')
      .mockResolvedValueOnce({ id: 'w1', balance: 0 } as any);

    const creditSpy = jest
      .spyOn(ledger, 'credit')
      .mockResolvedValueOnce({ id: 'w1', balance: 500 } as any);

    const txSpy = jest
      .spyOn(prisma.transaction, 'create')
      .mockResolvedValueOnce({ id: 't1' } as any);

    const updated = await service.addRevenue(500, 'video_tips', 'Commission sur tip vidéo');

    expect(updated.balance).toBe(500);
    expect(creditSpy).toHaveBeenCalled();
    expect(txSpy).toHaveBeenCalled();
  });

  it('getRevenueStats retourne les stats avec revenueBySource', async () => {
    jest.spyOn(service, 'getPlatformWallet').mockResolvedValueOnce({ id: 'w1', balance: 1000 } as any);

    jest.spyOn(prisma.transaction, 'aggregate').mockResolvedValueOnce({
      _sum: { amount: 1000 },
      _count: 5,
    } as any);

    jest.spyOn(prisma.transaction, 'findMany').mockResolvedValueOnce([
      { id: 't1', amount: 500 },
    ] as any);

    jest.spyOn(prisma.transaction, 'groupBy').mockResolvedValueOnce([
      {
        description: 'video_tips: Commission sur tip vidéo',
        _sum: { amount: 500 },
        _count: 2,
      },
    ] as any);

    const stats = await service.getRevenueStats();

    expect(stats.totalRevenue).toBe(1000);
    expect(stats.totalTransactions).toBe(5);
    expect(stats.currentBalance).toBe(1000);
    expect(stats.revenueBySource[0].source).toBe('video_tips');
    expect(stats.revenueBySource[0].amount).toBe(500);
    expect(stats.revenueBySource[0].count).toBe(2);
  });

  it('getRevenueByType applique un filtre sur la description', async () => {
    const aggSpy = jest
      .spyOn(prisma.transaction, 'aggregate')
      .mockResolvedValueOnce({
        _sum: { amount: 300 },
        _count: 3,
      } as any);

    jest.spyOn(prisma.transaction, 'findMany').mockResolvedValueOnce([
      { id: 't1', amount: 100 },
    ] as any);

    const res = await service.getRevenueByType('video_tips');

    expect(res.type).toBe('video_tips');
    expect(res.totalAmount).toBe(300);
    expect(res.totalCount).toBe(3);

    const whereArg = aggSpy.mock.calls[0][0].where;
    expect(whereArg.description.contains).toBe('Commission sur tip vidéo');
  });
});

