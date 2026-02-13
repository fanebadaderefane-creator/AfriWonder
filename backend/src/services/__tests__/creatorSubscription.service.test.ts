/**
 * Unit tests - CreatorSubscription Service CDC Phase 1
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CREATOR_TIERS } from '../creatorSubscription.service.js';

describe('creatorSubscription.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../creatorSubscription.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  describe('CREATOR_TIERS', () => {
    it('Basic = 1000 FCFA/mois', () => {
      expect(CREATOR_TIERS.basic.price_fcfa).toBe(1000);
      expect(CREATOR_TIERS.basic.label).toBe('Basic');
    });
    it('Pro = 3000 FCFA/mois', () => {
      expect(CREATOR_TIERS.pro.price_fcfa).toBe(3000);
      expect(CREATOR_TIERS.pro.label).toBe('Pro');
    });
  });

  describe('getActiveSubscription', () => {
    it('retourne null quand pas d\'abonnement actif', async () => {
      jest.spyOn(prisma.creatorSubscription, 'findFirst').mockResolvedValueOnce(null);

      const sub = await service.getActiveSubscription('creator-1');

      expect(sub).toBeNull();
    });

    it('retourne l\'abonnement actif le plus récent', async () => {
      const mockSub = {
        id: 'sub-1',
        creator_id: 'creator-1',
        tier: 'pro',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      jest.spyOn(prisma.creatorSubscription, 'findFirst').mockResolvedValueOnce(mockSub);

      const sub = await service.getActiveSubscription('creator-1');

      expect(sub).toEqual(mockSub);
      expect(sub.tier).toBe('pro');
    });
  });

  describe('expireSubscriptions', () => {
    it('met à jour les abonnements expirés', async () => {
      jest.spyOn(prisma.creatorSubscription, 'updateMany').mockResolvedValueOnce({ count: 2 });

      const count = await service.expireSubscriptions();

      expect(count).toBe(2);
      expect(prisma.creatorSubscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            expires_at: expect.any(Object),
          }),
          data: { status: 'expired' },
        })
      );
    });
  });
});
