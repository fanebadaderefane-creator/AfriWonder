/**
 * Tests unitaires pour WishlistService
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('WishlistService', () => {
  let prisma: any;
  let logger: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const loggerMod = await import('../../utils/logger.js');
    logger = loggerMod.logger;
    const mod = await import('../wishlist.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('getWishlist renvoie items + pagination', async () => {
    const findManySpy = jest
      .spyOn(prisma.wishlist, 'findMany')
      .mockResolvedValueOnce([]);
    const countSpy = jest
      .spyOn(prisma.wishlist, 'count')
      .mockResolvedValueOnce(0);

    const res = await service.getWishlist('user1', 1, 10);

    expect(findManySpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
    expect(res.pagination.total).toBe(0);
  });

  it('addToWishlist lève une erreur si produit introuvable', async () => {
    jest
      .spyOn(prisma.product, 'findUnique')
      .mockResolvedValueOnce(null);

    await expect(
      service.addToWishlist('user1', 'prod1')
    ).rejects.toThrow('Product not found');
  });

  it('removeFromWishlist lève une erreur si item absent', async () => {
    jest
      .spyOn(prisma.wishlist, 'findFirst')
      .mockResolvedValueOnce(null);

    await expect(
      service.removeFromWishlist('user1', 'prod1')
    ).rejects.toThrow('Item not found in wishlist');
  });

  it('isInWishlist retourne true quand un item existe', async () => {
    jest
      .spyOn(prisma.wishlist, 'findFirst')
      .mockResolvedValueOnce({ id: 'w1' } as any);

    const res = await service.isInWishlist('user1', 'prod1');
    expect(res).toBe(true);
  });
});

