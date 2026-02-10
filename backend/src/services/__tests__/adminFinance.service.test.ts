import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('adminFinance.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../adminFinance.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getFinanceDashboard agrège les données et retourne un objet complet', async () => {
    jest.spyOn(prisma.wallet, 'aggregate').mockResolvedValueOnce({
      _sum: { available_balance: 1000 },
    } as any)
    .mockResolvedValueOnce({
      _sum: { available_balance: 500 },
    } as any);

    jest.spyOn(prisma.transaction, 'aggregate')
      .mockResolvedValueOnce({ _sum: { amount: 100 }, _count: 5 } as any)
      .mockResolvedValueOnce({ _sum: { amount: 300 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 900 } } as any);

    jest.spyOn(prisma.loanRequest, 'findMany').mockResolvedValueOnce([
      { amount_requested: 1000, current_amount: 500 },
    ] as any);
    jest.spyOn(prisma.loanRequest, 'count')
      .mockResolvedValueOnce(1 as any) // defaulted count
      .mockResolvedValueOnce(1 as any); // completed count
    jest.spyOn(prisma.loanRequest, 'aggregate').mockResolvedValueOnce({
      _sum: { current_amount: 200 },
    } as any);

    jest.spyOn(prisma.campaign, 'findMany').mockResolvedValueOnce([
      { current_amount: 100 },
      { current_amount: 200 },
    ] as any);
    jest.spyOn(prisma.campaign, 'count')
      .mockResolvedValueOnce(2 as any) // suspicious
      .mockResolvedValueOnce(1 as any); // suspended

    jest.spyOn(prisma.withdrawal, 'aggregate').mockResolvedValueOnce({
      _count: 3,
      _sum: { amount: 150 },
    } as any);

    jest.spyOn(prisma.wallet, 'count').mockResolvedValueOnce(10 as any);

    const dashboard = await service.getFinanceDashboard();

    expect(dashboard.wallets.totalBalance).toBe(1000);
    expect(dashboard.wallets.totalEscrowBalance).toBe(500);
    expect(dashboard.transactions.countLast24h).toBe(5);
    expect(dashboard.crowdfunding.activeCampaigns).toBe(2);
    expect(dashboard.withdrawals.pendingCount).toBe(3);
    expect(dashboard.alerts.length).toBeGreaterThan(0);
  });

  it('freezeWallet gèle un wallet existant', async () => {
    jest
      .spyOn(prisma.wallet, 'findUnique')
      .mockResolvedValueOnce({ id: 'w1', status: 'active' } as any);

    const updateSpy = jest
      .spyOn(prisma.wallet, 'update')
      .mockResolvedValueOnce({ id: 'w1', status: 'frozen' } as any);

    const res = await service.freezeWallet('w1');

    expect(res.status).toBe('frozen');
    expect(updateSpy).toHaveBeenCalled();
  });
});

