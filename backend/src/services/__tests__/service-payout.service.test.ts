import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('service-payout.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../service-payout.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('calculateAvailablePayout calcule correctement les montants', async () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    jest.spyOn(prisma.serviceBooking, 'findMany').mockResolvedValueOnce([
      { id: 'b1', provider_earnings: 100, completed_at: fourDaysAgo },
      { id: 'b2', provider_earnings: 200, completed_at: fourDaysAgo },
    ] as any);

    jest.spyOn(prisma.servicePayout, 'findMany').mockResolvedValueOnce([
      { booking_ids: ['b1'] },
    ] as any);

    const res = await service.calculateAvailablePayout('prov-1');

    expect(res.total_earnings).toBe(300);
    expect(res.pending_payouts).toBe(100);
    expect(res.available_for_payout).toBe(200);
    expect(res.bookings.map((b: any) => b.id)).toEqual(['b2']);
  });

  it('createPayout lève une erreur si le prestataire est introuvable', async () => {
    jest.spyOn(prisma.serviceProvider, 'findUnique').mockResolvedValueOnce(null);

    await expect(service.createPayout('prov-404')).rejects.toThrow('Prestataire non trouvé');
  });

  it('createPayout crée un payout avec les montants corrects', async () => {
    jest.spyOn(prisma.serviceProvider, 'findUnique').mockResolvedValueOnce({
      id: 'prov-1',
      payout_method: 'mobile_money',
      payout_account: 'MOCK-ACCOUNT',
    } as any);

    jest.spyOn(service, 'calculateAvailablePayout').mockResolvedValueOnce({
      total_earnings: 300,
      pending_payouts: 0,
      available_for_payout: 300,
      bookings: [{ id: 'b1', provider_earnings: 300 }],
    } as any);

    jest.spyOn(service as any, 'commissionRate', 'get').mockReturnValue(0.2);

    const createSpy = jest
      .spyOn(prisma.servicePayout, 'create')
      .mockResolvedValueOnce({ id: 'p1' } as any);

    const payout = await service.createPayout('prov-1');

    expect(payout.id).toBe('p1');
    const data = createSpy.mock.calls[0][0].data;
    expect(data.amount).toBe(300);
    expect(data.commission_rate).toBe(0.2);
    expect(data.commission_amount).toBe(60);
    expect(data.net_amount).toBe(240);
  });

  it('processPayout met le payout en processing', async () => {
    jest.spyOn(prisma.servicePayout, 'findUnique').mockResolvedValueOnce({
      id: 'p1',
      status: 'pending',
    } as any);

    const updateSpy = jest
      .spyOn(prisma.servicePayout, 'update')
      .mockResolvedValueOnce({} as any);

    const payout = await service.processPayout('p1');

    expect(payout.id).toBe('p1');
    expect(updateSpy).toHaveBeenCalled();
  });

  it('getPayoutHistory retourne les payouts avec pagination', async () => {
    const payouts = [{ id: 'p1' }];
    jest
      .spyOn(prisma.servicePayout, 'findMany')
      .mockResolvedValueOnce(payouts as any);
    jest
      .spyOn(prisma.servicePayout, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.getPayoutHistory('prov-1', { page: 1, limit: 10 });

    expect(res.payouts).toBe(payouts);
    expect(res.pagination.total).toBe(1);
  });
});

