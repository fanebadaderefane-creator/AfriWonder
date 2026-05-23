import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('verification.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../verification.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('isKycApproved retourne true uniquement si status=approved', async () => {
    const spy = jest
      .spyOn(prisma.userVerification, 'findUnique')
      .mockResolvedValueOnce({ status: 'approved' } as any)
      .mockResolvedValueOnce({ status: 'pending' } as any)
      .mockResolvedValueOnce(null as any);

    expect(await service.isKycApproved('u1')).toBe(true);
    expect(await service.isKycApproved('u1')).toBe(false);
    expect(await service.isKycApproved('u1')).toBe(false);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('submit crée une nouvelle demande si aucune existante', async () => {
    jest
      .spyOn(prisma.userVerification, 'findUnique')
      .mockResolvedValueOnce(null);

    const createSpy = jest
      .spyOn(prisma.userVerification, 'create')
      .mockResolvedValueOnce({ id: 'v1' } as any);

    const res = await service.submit('u1', {
      document_type: 'id_card',
      document_url: 'https://example.com/id.jpg',
    });

    expect(res.id).toBe('v1');
    expect(createSpy).toHaveBeenCalled();
  });

  it('submit rejette si données manquantes', async () => {
    await expect(
      service.submit('u1', { document_type: '', document_url: '' }),
    ).rejects.toThrow(/requis/);
  });

  it('submit rejette si une demande pending existe déjà', async () => {
    jest
      .spyOn(prisma.userVerification, 'findUnique')
      .mockResolvedValueOnce({ status: 'pending' } as any);

    await expect(
      service.submit('u1', { document_type: 'id', document_url: 'url' }),
    ).rejects.toThrow(/déjà en cours/i);
  });

  it('listForAdmin renvoie verifications + pagination', async () => {
    const rows = [{ id: 'v1' }];
    const findSpy = jest
      .spyOn(prisma.userVerification, 'findMany')
      .mockResolvedValueOnce(rows as any);

    const countSpy = jest
      .spyOn(prisma.userVerification, 'count')
      .mockResolvedValueOnce(1 as any);

    const res = await service.listForAdmin(1, 10, 'pending');

    expect(res.verifications).toBe(rows);
    expect(res.pagination.total).toBe(1);
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
  });

  it('updateStatusByAdmin met à jour le KYC et le sellerProfile quand approuvé', async () => {
    jest
      .spyOn(prisma.userVerification, 'findUnique')
      .mockResolvedValueOnce({ id: 'v1', user_id: 'u1' } as any);

    const updateSpy = jest
      .spyOn(prisma.userVerification, 'update')
      .mockResolvedValueOnce({ id: 'v1', status: 'approved' } as any);

    const sellerSpy = jest
      .spyOn(prisma.sellerProfile, 'updateMany')
      .mockResolvedValueOnce({ count: 1 } as any);

    const userUpdateSpy = jest
      .spyOn(prisma.user, 'update')
      .mockResolvedValueOnce({ id: 'u1', is_verified: true } as any);

    const notifMod = await import('../notification.service.js');
    const notifSpy = jest
      .spyOn(notifMod.default, 'create')
      .mockResolvedValueOnce({} as any);

    const res = await service.updateStatusByAdmin('v1', 'admin-1', {
      status: 'approved',
    });

    expect(res.status).toBe('approved');
    expect(updateSpy).toHaveBeenCalled();
    expect(sellerSpy).toHaveBeenCalled();
    expect(userUpdateSpy).toHaveBeenCalled();
    expect(notifSpy).toHaveBeenCalled();
  });
});

