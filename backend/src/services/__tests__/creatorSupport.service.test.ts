/**
 * Unit tests - CreatorSupport Service CDC Phase 1
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('creatorSupport.service', () => {
  jest.setTimeout(60000);
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../creatorSupport.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  describe('getCreatorSupportStats', () => {
    it('retourne les stats agrégées pour un créateur', async () => {
      jest.spyOn(prisma.creatorSupport, 'count').mockResolvedValueOnce(5);
      jest.spyOn(prisma.creatorSupport, 'aggregate').mockResolvedValueOnce({
        _sum: { amount_fcfa: 15000, creator_earnings: 10500 },
      });
      jest.spyOn(prisma.creatorSupport, 'findMany').mockResolvedValueOnce([
        { id: 's1', amount_fcfa: 1000, supporter: { username: 'user1' } },
      ]);

      const stats = await service.getCreatorSupportStats('creator-1');

      expect(stats.total_supports).toBe(5);
      expect(stats.total_amount_fcfa).toBe(15000);
      expect(stats.total_creator_earnings).toBe(10500);
      expect(stats.recent).toHaveLength(1);
      expect(stats.recent[0].amount_fcfa).toBe(1000);
    });

    it('retourne 0 quand aucun support', async () => {
      jest.spyOn(prisma.creatorSupport, 'count').mockResolvedValueOnce(0);
      jest.spyOn(prisma.creatorSupport, 'aggregate').mockResolvedValueOnce({
        _sum: { amount_fcfa: null, creator_earnings: null },
      });
      jest.spyOn(prisma.creatorSupport, 'findMany').mockResolvedValueOnce([]);

      const stats = await service.getCreatorSupportStats('creator-2');

      expect(stats.total_supports).toBe(0);
      expect(stats.total_amount_fcfa).toBe(0);
      expect(stats.total_creator_earnings).toBe(0);
      expect(stats.recent).toEqual([]);
    });
  });

  describe('supportCreator (validation)', () => {
    it('rejette quand supporter === creator', async () => {
      await expect(
        service.supportCreator('user-1', 'user-1', { amount_fcfa: 100 })
      ).rejects.toThrow(/soutenir vous-même/);
    });

    it('rejette quand créateur inexistant', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(
        service.supportCreator('user-1', 'creator-inexistant', { amount_fcfa: 100 })
      ).rejects.toThrow(/Créateur non trouvé/);
    });
  });
});
