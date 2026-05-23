import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('refund.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../refund.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('listByUser retourne les remboursements pour les commandes de l’utilisateur', async () => {
    const orders = [{ id: 'o1' }, { id: 'o2' }];
    const refunds = [{ id: 'r1' }];

    const orderSpy = jest
      .spyOn(prisma.order, 'findMany')
      .mockResolvedValueOnce(orders as any);

    const refundSpy = jest
      .spyOn(prisma.refund, 'findMany')
      .mockResolvedValueOnce(refunds as any);

    const res = await service.listByUser('user-1');

    expect(res).toBe(refunds);
    expect(orderSpy).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
      select: { id: true },
    });
    expect(refundSpy).toHaveBeenCalled();
  });

  it('listAll renvoie les remboursements + pagination', async () => {
    const rows = [{ id: 'r1' }];
    const findSpy = jest
      .spyOn(prisma.refund, 'findMany')
      .mockResolvedValueOnce(rows as any);

    const countSpy = jest
      .spyOn(prisma.refund, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.listAll(1, 10, 'pending');

    expect(res.refunds).toBe(rows);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });
});

