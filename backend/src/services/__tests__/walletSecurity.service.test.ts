import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('walletSecurity.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../walletSecurity.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getOrCreate crée une entrée par défaut si inexistante', async () => {
    jest.spyOn(prisma.walletSecurity, 'findUnique').mockResolvedValueOnce(null);
    const createSpy = jest
      .spyOn(prisma.walletSecurity, 'create')
      .mockResolvedValueOnce({ user_id: 'u1', withdrawal_daily_limit: 500000 } as any);

    const sec = await service.getOrCreate('u1');

    expect(sec.user_id).toBe('u1');
    expect(createSpy).toHaveBeenCalled();
  });

  it('setPin met à jour le hash du PIN', async () => {
    jest.spyOn(prisma.walletSecurity, 'findUnique').mockResolvedValueOnce({
      id: 'sec-1',
      user_id: 'u1',
    } as any);

    const updateSpy = jest
      .spyOn(prisma.walletSecurity, 'update')
      .mockResolvedValueOnce({} as any);

    const res = await service.setPin('u1', '1234');

    expect(res.success).toBe(true);
    expect(updateSpy).toHaveBeenCalled();
  });

  it('validatePin retourne false si le hash ne correspond pas', async () => {
    jest.spyOn(prisma.walletSecurity, 'findUnique').mockResolvedValueOnce({
      id: 'sec-1',
      user_id: 'u1',
      pin_hash: 'deadbeef',
    } as any);

    const ok = await service.validatePin('u1', '0000');

    expect(ok).toBe(false);
  });

  it('checkCanWithdraw bloque si wallet est bloqué', async () => {
    jest.spyOn(prisma.walletSecurity, 'findUnique').mockResolvedValueOnce({
      id: 'sec-1',
      user_id: 'u1',
      is_blocked: true,
      blocked_reason: 'fraude',
    } as any);

    const res = await service.checkCanWithdraw('u1', 1000);

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('fraude');
  });

  it('recordWithdrawal incrémente le compteur quotidien', async () => {
    const now = new Date();
    jest.spyOn(prisma.walletSecurity, 'findUnique').mockResolvedValueOnce({
      id: 'sec-1',
      user_id: 'u1',
      withdrawal_count_today: 1000,
      last_withdrawal_at: now,
    } as any);

    const updateSpy = jest
      .spyOn(prisma.walletSecurity, 'update')
      .mockResolvedValueOnce({} as any);

    await service.recordWithdrawal('u1', 500);

    const data = updateSpy.mock.calls[0][0].data;
    expect(data.withdrawal_count_today).toBe(1500);
  });
});

