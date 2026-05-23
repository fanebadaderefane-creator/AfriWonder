import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('riskEngine.service', () => {
  let evaluate: (ctx: import('../riskEngine.service.js').RiskContext) => Promise<import('../riskEngine.service.js').RiskResult>;
  let prisma: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../riskEngine.service.js');
    evaluate = mod.evaluate;
    jest.restoreAllMocks();
  });

  it('refuse immédiatement si l’utilisateur est blacklisté (user)', async () => {
    jest
      .spyOn(prisma.blacklistEntry, 'findFirst')
      .mockResolvedValueOnce({ id: 'bl-1', type: 'user', value: 'user-1' } as any);

    const res = await evaluate({
      userId: 'user-1',
      action: 'payment_init',
    });

    expect(res.allowed).toBe(false);
    expect(res.score).toBe(100);
    expect(res.reason).toMatch(/Compte restreint/i);
  });

  it('autorise la requête quand aucun contrôle ne bloque (action non paiement)', async () => {
    jest
      .spyOn(prisma.blacklistEntry, 'findFirst')
      .mockResolvedValue(null);

    const res = await evaluate({
      userId: 'user-ok',
      action: 'ticket_book',
      ip: '10.0.0.1',
    });

    expect(res.allowed).toBe(true);
    expect(res.score).toBe(0);
  });
});


