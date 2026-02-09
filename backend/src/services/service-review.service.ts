/**
 * Service de gestion des avis sur les services
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class ServiceReviewService {
  /**
   * Créer un avis sur un service
   */
  async createReview(bookingId: string, customerId: string, data: {
    rating: number; // 1-5
    title?: string;
    content: string;
    photos?: string[];
  }) {
    // Vérifier que la réservation existe et appartient au client
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
      },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    if (booking.customer_id !== customerId) {
      throw new Error('Non autorisé');
    }

    if (booking.status !== 'completed') {
      throw new Error('Le service doit être complété pour laisser un avis');
    }

    // Vérifier si un avis existe déjà
    const existingReview = await prisma.serviceReview.findUnique({
      where: { booking_id: bookingId },
    });

    if (existingReview) {
      throw new Error('Avis déjà laissé pour cette réservation');
    }

    // Valider la note
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('La note doit être entre 1 et 5');
    }

    // Créer l'avis
    const review = await prisma.serviceReview.create({
      data: {
        booking_id: bookingId,
        service_id: booking.service_id,
        provider_id: booking.provider_id,
        customer_id: customerId,
        rating: data.rating,
        title: data.title,
        content: data.content,
        photos: data.photos || [],
        is_verified: true, // Client a utilisé le service
        status: 'approved',
      },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Mettre à jour la note moyenne du service
    await this.updateServiceRating(booking.service_id);

    // Mettre à jour la note moyenne du prestataire
    await this.updateProviderRating(booking.provider_id);

    logger.info('Avis créé', { reviewId: review.id, bookingId, serviceId: booking.service_id });
    return review;
  }

  /**
   * Obtenir les avis d'un service
   */
  async getServiceReviews(serviceId: string, filters: {
    page?: number;
    limit?: number;
    min_rating?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      service_id: serviceId,
      status: 'approved',
    };

    if (filters.min_rating) {
      where.rating = { gte: filters.min_rating };
    }

    const [reviews, total] = await Promise.all([
      prisma.serviceReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
      }),
      prisma.serviceReview.count({ where }),
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
   * Obtenir les avis d'un prestataire
   */
  async getProviderReviews(providerId: string, filters: {
    page?: number;
    limit?: number;
    min_rating?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      provider_id: providerId,
      status: 'approved',
    };

    if (filters.min_rating) {
      where.rating = { gte: filters.min_rating };
    }

    const [reviews, total] = await Promise.all([
      prisma.serviceReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.serviceReview.count({ where }),
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
   * Signaler un avis abusif
   */
  async reportReview(reviewId: string, reporterId: string, reason: string) {
    const review = await prisma.serviceReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Avis non trouvé');
    }

    // Mettre l'avis en attente de modération
    await prisma.serviceReview.update({
      where: { id: reviewId },
      data: {
        status: 'pending',
      },
    });

    // TODO: Créer un signalement dans le système de modération

    logger.info('Avis signalé', { reviewId, reporterId, reason });
    return { success: true };
  }

  /**
   * Mettre à jour la note moyenne d'un service
   */
  private async updateServiceRating(serviceId: string) {
    const stats = await prisma.serviceReview.aggregate({
      where: {
        service_id: serviceId,
        status: 'approved',
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        rating: stats._avg.rating || 0,
        total_bookings: stats._count.id || 0,
      },
    });
  }

  /**
   * Mettre à jour la note moyenne d'un prestataire
   */
  private async updateProviderRating(providerId: string) {
    const stats = await prisma.serviceReview.aggregate({
      where: {
        provider_id: providerId,
        status: 'approved',
      },
      _avg: { rating: true },
    });

    await prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        average_rating: stats._avg.rating || 0,
      },
    });
  }
}

export default new ServiceReviewService();
