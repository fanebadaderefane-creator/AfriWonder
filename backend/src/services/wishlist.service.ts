import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class WishlistService {
  async getWishlist(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { user_id: userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              images: true,
              category: true,
              stock: true,
              seller: {
                select: {
                  id: true,
                  username: true,
                  profile_image: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.wishlist.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const existing = await prisma.wishlist.findFirst({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    if (existing) {
      throw new Error('Product already in wishlist');
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        user_id: userId,
        product_id: productId,
      },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                profile_image: true,
              },
            },
          },
        },
      },
    });

    logger.info('Product added to wishlist', { userId, productId });
    return wishlistItem;
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await prisma.wishlist.findFirst({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    if (!item) {
      throw new Error('Item not found in wishlist');
    }

    const wishlistItem = await prisma.wishlist.delete({
      where: {
        id: item.id,
      },
    });

    logger.info('Product removed from wishlist', { userId, productId });
    return wishlistItem;
  }

  async isInWishlist(userId: string, productId: string) {
    const item = await prisma.wishlist.findFirst({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    return !!item;
  }
}

export default new WishlistService();

