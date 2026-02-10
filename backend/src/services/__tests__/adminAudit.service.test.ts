import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('adminAudit.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../adminAudit.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('log crée un adminLog avec les valeurs par défaut', async () => {
    const createSpy = jest
      .spyOn(prisma.adminLog, 'create')
      .mockResolvedValueOnce({ id: 'log-1' } as any);

    const res = await service.log({
      admin_id: 'admin-1',
      action_type: 'ban_user',
    });

    expect(res.id).toBe('log-1');
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        admin_id: 'admin-1',
        action_type: 'ban_user',
        target_type: null,
        target_id: null,
        metadata: undefined,
        ip_address: null,
        user_agent: null,
      },
    });
  });

  it('list applique les filtres et retourne logs + pagination', async () => {
    const logs = [{ id: 'l1' }];
    const findSpy = jest
      .spyOn(prisma.adminLog, 'findMany')
      .mockResolvedValueOnce(logs as any);

    const countSpy = jest
      .spyOn(prisma.adminLog, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.list({
      page: 1,
      limit: 10,
      admin_id: 'admin-1',
      action_type: 'ban_user',
    });

    expect(res.logs).toBe(logs);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });
});

