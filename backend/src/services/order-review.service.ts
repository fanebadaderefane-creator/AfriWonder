import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

const orderReviewModel: any = (Prisma as any)?.dmmf?.datamodel?.models?.find((m: any) => m.name === 'OrderReview');
const ORDER_REVIEW_FIELDS = new Set<string>((orderReviewModel?.fields || []).map((f: any) => f.name));

class OrderReviewService {
  private toHttpError(message: string, statusCode: number) {
    const error = new Error(message) as Error & { statusCode?: number };
    error.statusCode = statusCode;
    return error;
  }

  private validateRatingValue(value: unknown, field: string, required = false): number | undefined {
    if (value == null || value === '') {
      if (required) throw this.toHttpError(`${field} requis`, 400);
      return undefined;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      throw this.toHttpError(`${field} doit etre entre 1 et 5`, 400);
    }
    return Math.round(n);
  }

  async createReview(orderId: string, userId: string, data: {
    order_item_id?: string;
    product_id: string;
    product_rating: number;
    seller_rating?: number;
    quality_rating?: number;
    communication_rating?: number;
    delivery_rating?: number;
    conformity_rating?: number;
    title?: string;
    content: string;
    photos?: string[];
  }) {
    const productRating = this.validateRatingValue(data.product_rating, 'product_rating', true)!;
    const sellerRating = this.validateRatingValue(data.seller_rating, 'seller_rating');
    const qualityRating = this.validateRatingValue(data.quality_rating, 'quality_rating');
    const communicationRating = this.validateRatingValue(data.communication_rating, 'communication_rating');
    const deliveryRating = this.validateRatingValue(data.delivery_rating, 'delivery_rating');
    const conformityRating = this.validateRatingValue(data.conformity_rating, 'conformity_rating');

    if (!data.content || typeof data.content !== 'string' || data.content.trim().length < 3) {
      throw this.toHttpError('content requis (min 3 caracteres)', 400);
    }
    const sanitizedContent = data.content.trim().slice(0, 2000);
    const sanitizedTitle = typeof data.title === 'string' ? data.title.trim().slice(0, 180) : undefined;
    const sanitizedPhotos = Array.isArray(data.photos)
      ? data.photos.filter((u) => typeof u === 'string' && !!u.trim()).slice(0, 8)
      : [];

    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                seller_id: true,
              },
            },
          },
        },
      } as any,
    });

    if (!order) {
      throw this.toHttpError('Commande non trouvee', 404);
    }

    if (order.user_id !== userId) {
      throw this.toHttpError('Non autorise', 403);
    }

    const paidStates = new Set(['paid', 'escrow', 'released', 'released_to_seller']);
    const deliveredStates = new Set(['delivered', 'completed']);
    if (!paidStates.has(String(order.payment_status || '').toLowerCase())) {
      throw this.toHttpError('Avis autorise uniquement apres paiement confirme', 400);
    }
    if (!deliveredStates.has(String(order.status || '').toLowerCase())) {
      throw this.toHttpError('Avis autorise uniquement apres livraison confirmee', 400);
    }

    const orderItem = order.items.find((item: any) =>
      item.product_id === data.product_id && (!data.order_item_id || item.id === data.order_item_id)
    );

    if (!orderItem) {
      throw this.toHttpError('Produit non trouve dans la commande', 400);
    }

    const existingReview = await prisma.orderReview.findFirst({
      where: {
        order_id: orderId,
        product_id: data.product_id,
      },
    });

    if (existingReview) {
      throw this.toHttpError('Un avis existe deja pour ce produit dans cette commande', 409);
    }

    const sellerId = orderItem.product.seller_id;

    const createData: any = {
      order_id: orderId,
      order_item_id: data.order_item_id || orderItem.id,
      product_id: data.product_id,
      seller_id: sellerId,
      user_id: userId,
      product_rating: productRating,
      seller_rating: sellerRating,
      title: sanitizedTitle,
      content: sanitizedContent,
      photos: sanitizedPhotos,
      is_verified: true,
      status: 'approved',
    };
    if (ORDER_REVIEW_FIELDS.has('quality_rating')) createData.quality_rating = qualityRating ?? undefined;
    if (ORDER_REVIEW_FIELDS.has('communication_rating')) createData.communication_rating = communicationRating ?? undefined;
    if (ORDER_REVIEW_FIELDS.has('delivery_rating')) createData.delivery_rating = deliveryRating ?? undefined;
    if (ORDER_REVIEW_FIELDS.has('conformity_rating')) createData.conformity_rating = conformityRating ?? undefined;

    const review = await prisma.orderReview.create({ data: createData });

    await this.updateProductRating(data.product_id);

    if (sellerRating && sellerId) {
      await this.updateSellerRating(sellerId);
      const existingSellerReview = await prisma.sellerReview.findFirst({
        where: { user_id: userId, seller_id: sellerId, order_id: orderId },
      });
      if (!existingSellerReview) {
        await prisma.sellerReview.create({
          data: {
            user_id: userId,
            seller_id: sellerId,
            order_id: orderId,
            rating: sellerRating,
            content: sanitizedContent.slice(0, 500),
            status: 'approved',
          },
        });
      }
    }

    logger.info('Avis cree', { orderId, productId: data.product_id, reviewId: review.id });
    return review;
  }

  private async updateProductRating(productId: string) {
    const reviews = await prisma.orderReview.findMany({
      where: {
        product_id: productId,
        status: 'approved',
      } as any,
      select: {
        product_rating: true,
      },
    });

    if (reviews.length === 0) return;

    const averageRating = reviews.reduce((sum, r) => sum + r.product_rating, 0) / reviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        // rating field not yet available on Product schema
      },
    });

    logger.info('Note produit mise a jour', { productId, averageRating });
  }

  private async updateSellerRating(sellerId: string) {
    const reviews = await prisma.orderReview.findMany({
      where: {
        seller_id: sellerId,
        seller_rating: { not: null },
        status: 'approved',
      } as any,
      select: {
        seller_rating: true,
      },
    });

    if (reviews.length === 0) return;

    const ratings = reviews.map(r => r.seller_rating!).filter(r => r != null);
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { user_id: sellerId } });
    if (sellerProfile) {
      await prisma.sellerProfile.update({
        where: { user_id: sellerId },
        data: { rating: averageRating },
      });
    }

    logger.info('Note vendeur mise a jour', { sellerId, averageRating });
  }

  async getProductReviews(productId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.orderReview.findMany({
        where: {
          product_id: productId,
          status: 'approved',
        } as any,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.orderReview.count({
        where: {
          product_id: productId,
          status: 'approved',
        } as any,
      }),
    ]);

    const sum = {
      product: 0,
      seller: 0,
      quality: 0,
      communication: 0,
      delivery: 0,
      conformity: 0,
    };
    const count = {
      product: 0,
      seller: 0,
      quality: 0,
      communication: 0,
      delivery: 0,
      conformity: 0,
    };
    for (const r of reviews as any[]) {
      if (r.product_rating != null) { sum.product += r.product_rating; count.product++; }
      if (r.seller_rating != null) { sum.seller += r.seller_rating; count.seller++; }
      if (r.quality_rating != null) { sum.quality += r.quality_rating; count.quality++; }
      if (r.communication_rating != null) { sum.communication += r.communication_rating; count.communication++; }
      if (r.delivery_rating != null) { sum.delivery += r.delivery_rating; count.delivery++; }
      if (r.conformity_rating != null) { sum.conformity += r.conformity_rating; count.conformity++; }
    }

    return {
      reviews,
      stats: {
        average_product_rating: count.product ? sum.product / count.product : 0,
        average_seller_rating: count.seller ? sum.seller / count.seller : 0,
        average_quality_rating: count.quality ? sum.quality / count.quality : 0,
        average_communication_rating: count.communication ? sum.communication / count.communication : 0,
        average_delivery_rating: count.delivery ? sum.delivery / count.delivery : 0,
        average_conformity_rating: count.conformity ? sum.conformity / count.conformity : 0,
        total_reviews: total,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderReviews(orderId: string) {
    const reviews = await prisma.orderReview.findMany({
      where: {
        order_id: orderId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reviews;
  }

  async replyToReview(reviewId: string, sellerId: string, reply: string) {
    const review = await prisma.orderReview.findUnique({
      where: { id: reviewId },
      select: { seller_id: true, status: true },
    });
    if (!review) throw this.toHttpError('Avis non trouve', 404);
    if (review.status !== 'approved') throw this.toHttpError('Impossible de repondre a un avis non approuve', 400);
    if (review.seller_id !== sellerId) throw this.toHttpError('Non autorise : vous n etes pas le vendeur de ce produit', 403);

    const updated = await prisma.orderReview.update({
      where: { id: reviewId },
      data: { seller_reply: reply.trim().slice(0, 1000), seller_reply_at: new Date() } as any,
    });
    logger.info('Reponse vendeur a l avis', { reviewId, sellerId });
    return updated;
  }

  /** CDC 2.2.6: Notation mutuelle - Le vendeur note l'acheteur */
  async rateBuyer(orderId: string, sellerId: string, data: { rating: number; content?: string }) {
    const rating = this.validateRatingValue(data.rating, 'rating', true)!;
    const content = typeof data.content === 'string' && data.content.trim()
      ? data.content.trim().slice(0, 500)
      : undefined;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        user_id: true,
        status: true,
        items: {
          select: {
            product: { select: { seller_id: true } },
          },
        },
      },
    });

    if (!order) throw this.toHttpError('Commande non trouvee', 404);

    const orderSellerIds = new Set(
      (order.items as any[]).map((i) => i.product?.seller_id).filter(Boolean)
    );
    if (!orderSellerIds.has(sellerId)) {
      throw this.toHttpError('Non autorise : vous n etes pas le vendeur de cette commande', 403);
    }

    const deliveredStates = new Set(['delivered', 'completed']);
    if (!deliveredStates.has(String(order.status || '').toLowerCase())) {
      throw this.toHttpError('Notation possible uniquement apres livraison confirmee', 400);
    }

    const existing = await prisma.orderBuyerReview.findUnique({
      where: {
        order_id_seller_id: { order_id: orderId, seller_id: sellerId },
      },
    });

    if (existing) {
      throw this.toHttpError('Vous avez deja note cet acheteur pour cette commande', 409);
    }

    const review = await prisma.orderBuyerReview.create({
      data: {
        order_id: orderId,
        seller_id: sellerId,
        buyer_id: order.user_id,
        rating,
        content,
      },
    });

    logger.info('Vendeur a note l acheteur', { orderId, sellerId, buyerId: order.user_id, rating });
    return review;
  }
}

export const orderReviewService = new OrderReviewService();
export default orderReviewService;
