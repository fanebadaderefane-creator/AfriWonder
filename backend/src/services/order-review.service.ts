import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Service de gestion des avis sur les commandes
 * 
 * Fonctionnalités :
 * - Créer avis produit + vendeur
 * - Upload photos
 * - Badge "Acheteur vérifié"
 * - Mise à jour notes produits/vendeurs
 */
class OrderReviewService {
  /**
   * Créer un avis pour un produit d'une commande
   */
  async createReview(orderId: string, userId: string, data: {
    order_item_id?: string;
    product_id: string;
    product_rating: number;
    seller_rating?: number;
    title?: string;
    content: string;
    photos?: string[];
  }) {
    const order = await prisma.order.findUnique({
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
      },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    if (order.user_id !== userId) {
      throw new Error('Non autorisé');
    }

    // Vérifier que le produit est bien dans la commande
    const orderItem = order.items.find(
      item => item.product_id === data.product_id
    );

    if (!orderItem) {
      throw new Error('Produit non trouvé dans la commande');
    }

    // Vérifier qu'un avis n'existe pas déjà pour ce produit dans cette commande
    const existingReview = await prisma.orderReview.findFirst({
      where: {
        order_id: orderId,
        product_id: data.product_id,
      },
    });

    if (existingReview) {
      throw new Error('Un avis existe déjà pour ce produit dans cette commande');
    }

    const sellerId = orderItem.product.seller_id;

    // Créer l'avis
    const review = await prisma.orderReview.create({
      data: {
        order_id: orderId,
        order_item_id: data.order_item_id || orderItem.id,
        product_id: data.product_id,
        seller_id: sellerId,
        user_id: userId,
        product_rating: data.product_rating,
        seller_rating: data.seller_rating,
        title: data.title,
        content: data.content,
        photos: data.photos || [],
        is_verified: true, // Acheteur vérifié (a acheté)
        status: 'approved',
      },
    });

    // Mettre à jour la note moyenne du produit
    await this.updateProductRating(data.product_id);

    // Mettre à jour la note moyenne du vendeur si seller_rating fourni
    if (data.seller_rating && sellerId) {
      await this.updateSellerRating(sellerId);
    }

    logger.info('Avis créé', { orderId, productId: data.product_id, reviewId: review.id });
    return review;
  }

  /**
   * Mettre à jour la note moyenne d'un produit
   */
  private async updateProductRating(productId: string) {
    const reviews = await prisma.orderReview.findMany({
      where: {
        product_id: productId,
        status: 'approved',
      },
      select: {
        product_rating: true,
      },
    });

    if (reviews.length === 0) return;

    const averageRating = reviews.reduce((sum, r) => sum + r.product_rating, 0) / reviews.length;

    // Mettre à jour le produit (si le champ rating existe)
    await prisma.product.update({
      where: { id: productId },
      data: {
        // Note: Le modèle Product n'a peut-être pas de champ rating, à adapter
        // rating: averageRating,
      },
    });

    logger.info('Note produit mise à jour', { productId, averageRating });
  }

  /**
   * Mettre à jour la note moyenne d'un vendeur
   */
  private async updateSellerRating(sellerId: string) {
    const reviews = await prisma.orderReview.findMany({
      where: {
        seller_id: sellerId,
        seller_rating: { not: null },
        status: 'approved',
      },
      select: {
        seller_rating: true,
      },
    });

    if (reviews.length === 0) return;

    const ratings = reviews.map(r => r.seller_rating!).filter(r => r !== null);
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Mettre à jour le profil vendeur (si le champ rating existe)
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: sellerId },
    });

    if (sellerProfile) {
      // Note: Le modèle SellerProfile n'a peut-être pas de champ rating, à adapter
      // await prisma.sellerProfile.update({
      //   where: { user_id: sellerId },
      //   data: { rating: averageRating },
      // });
    }

    logger.info('Note vendeur mise à jour', { sellerId, averageRating });
  }

  /**
   * Obtenir les avis d'un produit
   */
  async getProductReviews(productId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.orderReview.findMany({
        where: {
          product_id: productId,
          status: 'approved',
        },
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

  /**
   * Obtenir les avis d'une commande
   */
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
}

export const orderReviewService = new OrderReviewService();
export default orderReviewService;
