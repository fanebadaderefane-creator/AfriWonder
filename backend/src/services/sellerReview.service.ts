import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class SellerReviewService {
  async listBySeller(sellerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      prisma.sellerReview.findMany({
        where: { seller_id: sellerId, status: 'approved' },
        include: {
          user: {
            select: { id: true, username: true, full_name: true, profile_image: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sellerReview.count({ where: { seller_id: sellerId, status: 'approved' } }),
    ]);
    const avg = await prisma.sellerReview.aggregate({
      where: { seller_id: sellerId, status: 'approved' },
      _avg: { rating: true },
      _count: true,
    });
    return {
      reviews,
      averageRating: avg._avg.rating ?? 0,
      totalCount: avg._count,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(userId: string, sellerId: string, data: { rating: number; content?: string; order_id?: string }) {
    if (data.rating < 1 || data.rating > 5) {
      const err: any = new Error('Rating must be between 1 and 5');
      err.statusCode = 400;
      throw err;
    }
    const existing = await prisma.sellerReview.findFirst({
      where: { user_id: userId, seller_id: sellerId, order_id: data.order_id || null },
    });
    if (existing) {
      const err: any = new Error('You already reviewed this seller');
      err.statusCode = 400;
      throw err;
    }
    const review = await prisma.sellerReview.create({
      data: {
        seller_id: sellerId,
        user_id: userId,
        order_id: data.order_id,
        rating: data.rating,
        content: data.content,
        status: 'approved',
      },
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    await this.updateSellerProfileRating(sellerId);
    logger.info('Seller review created', { reviewId: review.id, sellerId, userId });
    return review;
  }

  private async updateSellerProfileRating(sellerId: string) {
    const agg = await prisma.sellerReview.aggregate({
      where: { seller_id: sellerId, status: 'approved' },
      _avg: { rating: true },
    });
    const profile = await prisma.sellerProfile.findUnique({
      where: { user_id: sellerId },
    });
    if (profile) {
      await prisma.sellerProfile.update({
        where: { user_id: sellerId },
        data: { rating: agg._avg.rating ?? 0 },
      });
    }
  }

  async update(reviewId: string, userId: string, data: { rating?: number; content?: string }) {
    const review = await prisma.sellerReview.findUnique({ where: { id: reviewId } });
    if (!review || review.user_id !== userId) {
      const err: any = new Error('Review not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    const updated = await prisma.sellerReview.update({
      where: { id: reviewId },
      data: { rating: data.rating, content: data.content },
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
    await this.updateSellerProfileRating(review.seller_id);
    return updated;
  }

  async delete(reviewId: string, userId: string) {
    const review = await prisma.sellerReview.findUnique({ where: { id: reviewId } });
    if (!review || review.user_id !== userId) {
      const err: any = new Error('Review not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    await prisma.sellerReview.delete({ where: { id: reviewId } });
    await this.updateSellerProfileRating(review.seller_id);
    return { deleted: true };
  }
}

export default new SellerReviewService();
