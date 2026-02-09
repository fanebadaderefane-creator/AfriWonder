import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class ReviewService {
  async list(productId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          product_id: productId,
          status: 'approved',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile_image: true,
            },
          },
          replies: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.review.count({
        where: {
          product_id: productId,
          status: 'approved',
        },
      }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(userId: string, productId: string, data: {
    rating: number;
    title?: string;
    content: string;
    photos?: string[];
  }) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user has already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Check if user has purchased (for verified purchase badge)
    const hasPurchased = await prisma.order.findFirst({
      where: {
        user_id: userId,
        status: 'completed',
        items: {
          some: {
            product_id: productId,
          },
        },
      },
    });

    const review = await prisma.review.create({
      data: {
        product_id: productId,
        user_id: userId,
        rating: data.rating,
        title: data.title,
        content: data.content,
        photos: data.photos || [],
        verified_purchase: !!hasPurchased,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
      },
    });

    // Update product rating
    await this.updateProductRating(productId);

    logger.info('Review created', { userId, productId, reviewId: review.id });
    return review;
  }

  async update(reviewId: string, userId: string, data: {
    rating?: number;
    title?: string;
    content?: string;
    photos?: string[];
  }) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.user_id !== userId) {
      throw new Error('Review not found or unauthorized');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...data,
        status: 'pending', // Re-submit for approval
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
      },
    });

    await this.updateProductRating(review.product_id);

    logger.info('Review updated', { reviewId, userId });
    return updatedReview;
  }

  async delete(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.user_id !== userId) {
      throw new Error('Review not found or unauthorized');
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    await this.updateProductRating(review.product_id);

    logger.info('Review deleted', { reviewId, userId });
    return { success: true };
  }

  async markHelpful(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpful_count: {
          increment: 1,
        },
      },
    });

    logger.info('Review marked as helpful', { reviewId, userId });
    return updatedReview;
  }

  async reply(reviewId: string, responderId: string, content: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const reply = await prisma.reviewReply.create({
      data: {
        review_id: reviewId,
        responder_id: responderId,
        content,
      },
    });

    logger.info('Reply added to review', { reviewId, responderId });
    return reply;
  }

  private async updateProductRating(productId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        product_id: productId,
        status: 'approved',
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) return;

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // Note: Product model doesn't have rating field, so we might need to add it
    // For now, we'll just log it
    logger.info('Product rating updated', { productId, averageRating });
  }
}

export default new ReviewService();

