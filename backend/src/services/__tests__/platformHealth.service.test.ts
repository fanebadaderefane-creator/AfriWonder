import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('platformHealth.service', () => {
  let prisma: any;
  let getPlatformHealth: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;

    const mod = await import('../platformHealth.service.js');
    getPlatformHealth = mod.getPlatformHealth;

    jest.restoreAllMocks();
  });

  it('getPlatformHealth agrège les métriques et retourne un statut', async () => {
    jest.spyOn(prisma.userPresence, 'count').mockResolvedValueOnce(5 as any);
    jest.spyOn(prisma.transaction, 'count')
      .mockResolvedValueOnce(20 as any) // last minute
      .mockResolvedValueOnce(2 as any); // failed last hour

    const health = await getPlatformHealth();

    expect(health.users_online).toBe(5);
    expect(health.transactions_last_minute).toBe(20);
    expect(health.failed_payments_last_hour).toBe(2);
    expect(['stable', 'degraded', 'critical']).toContain(health.status);
  });

  it('réutilise le cache pour les appels rapprochés', async () => {
    const presenceSpy = jest
      .spyOn(prisma.userPresence, 'count')
      .mockResolvedValueOnce(3 as any);
    jest.spyOn(prisma.transaction, 'count')
      .mockResolvedValueOnce(5 as any)
      .mockResolvedValueOnce(0 as any);

    const first = await getPlatformHealth();
    const second = await getPlatformHealth();

    expect(first.users_online).toBe(3);
    expect(second.users_online).toBe(3);
    expect(presenceSpy).toHaveBeenCalledTimes(1);
  });
});


