import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';

class ServiceService {
  async list(page: number = 1, limit: number = 20, filters?: {
    category?: string;
    isAvailable?: boolean;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'popular' | 'recent' | 'price_asc' | 'price_desc';
    includePending?: boolean;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {
      provider: { status: 'active' },
    };

    if (filters?.category) where.category = filters.category;
    if (filters?.includePending) {
      where.is_available = false;
    } else if (filters?.isAvailable !== undefined) {
      where.is_available = filters.isAvailable;
    } else {
      where.is_available = true;
    }
    if (filters?.minPrice !== undefined) {
      where.price = { ...(where.price || {}), gte: Number(filters.minPrice) };
    }
    if (filters?.maxPrice !== undefined) {
      where.price = { ...(where.price || {}), lte: Number(filters.maxPrice) };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      filters?.sortBy === 'recent'
        ? { created_at: 'desc' as const }
        : filters?.sortBy === 'price_asc'
          ? { price: 'asc' as const }
          : filters?.sortBy === 'price_desc'
            ? { price: 'desc' as const }
            : { total_bookings: 'desc' as const };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          provider: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  username: true,
                  profile_image: true,
                },
              },
            },
          },
        },
      }),
      prisma.service.count({ where }),
    ]);

    return {
      services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(providerId: string, data: {
    title: string;
    description: string;
    price: number;
    currency?: string;
    duration?: number;
    category?: string;
    category_id?: string;
    location?: string;
    location_type?: string;
    travel_fee?: number;
  }) {
    // Vérifier que le prestataire existe
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Prestataire non trouvé');
    }
    if (provider.status !== 'active') {
      throw new Error('Votre profil prestataire doit être validé par un admin');
    }

    const service = await prisma.service.create({
      data: {
        provider_id: providerId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || 'XOF',
        duration: data.duration,
        category: data.category,
        category_id: data.category_id,
        location: data.location,
        location_type: data.location_type || 'both',
        travel_fee: data.travel_fee || 0,
        is_available: false,
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    logger.info('Service created', { providerId, serviceId: service.id });
    return service;
  }

  async getById(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: {
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
        },
      },
    });
    if (!service) throw new Error('Service non trouvé');
    return service;
  }

  async listPending(page: number = 1, limit: number = 50) {
    return this.list(page, limit, { includePending: true, sortBy: 'recent' });
  }

  async approve(serviceId: string) {
    return prisma.service.update({
      where: { id: serviceId },
      data: { is_available: true },
    });
  }

  async reject(serviceId: string) {
    return prisma.service.update({
      where: { id: serviceId },
      data: { is_available: false },
    });
  }

  // Commission plateforme : 10% sur les services
  private readonly PLATFORM_COMMISSION_RATE = 0.1;

  /**
   * Réserver et payer un service
   * Note: Utilise une transaction comme réservation (pas de modèle ServiceBooking)
   */
  async bookService(serviceId: string, customerId: string, data: {
    phone: string;
    bookingDate?: Date;
    notes?: string;
  }) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: true,
      },
    });

    if (!service || !service.is_available) {
      throw new Error('Service non disponible');
    }

    // Calculer les montants
    const platformFee = service.price * this.PLATFORM_COMMISSION_RATE;
    const providerEarnings = service.price - platformFee;

    // Créer une transaction comme réservation
    const bookingTransaction = await prisma.transaction.create({
      data: {
        user_id: customerId,
        type: 'service_booking',
        amount: service.price,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Réservation service - ${service.title}${data.notes ? ` - ${data.notes}` : ''}`,
        reference_id: serviceId,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        customerId,
        bookingTransaction.id,
        {
          amount: service.price,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/services/${serviceId}?booking=success`,
        }
      );

      logger.info('Réservation service créée et paiement Orange Money initié', {
        transactionId: bookingTransaction.id,
        serviceId,
        customerId,
        amount: service.price,
      });

      return {
        transactionId: bookingTransaction.id,
        serviceId,
        paymentUrl: paymentResult.paymentUrl,
      };
    } catch (error: any) {
      // En cas d'erreur, supprimer la transaction
      await prisma.transaction.delete({
        where: { id: bookingTransaction.id },
      });

      throw error;
    }
  }

  /**
   * Confirmer le paiement d'un service
   * NOTE: Cette méthode est dépréciée, utiliser bookingService.confirmPayment() à la place
   */
  async confirmServicePayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'service_booking') {
      throw new Error('Transaction de service non trouvée');
    }

    const service = await prisma.service.findUnique({
      where: { id: transaction.reference_id! },
      include: {
        provider: true,
      },
    });

    if (!service) {
      throw new Error('Service non trouvé');
    }

    // Calculer les montants
    const platformFee = transaction.amount * this.PLATFORM_COMMISSION_RATE;
    const providerEarnings = transaction.amount - platformFee;

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
        type: 'service_payment',
      },
    });

    // Créditer le wallet du prestataire
    const sellerWallet = await withdrawalService.getSellerWallet(service.provider_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: providerEarnings,
        },
      },
    });

    // Créer transaction pour le prestataire
    await prisma.transaction.create({
      data: {
        user_id: service.provider_id,
        type: 'service_received',
        amount: providerEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Service réservé - ${service.title} (${transaction.amount} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: transactionId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 10%)
    await platformRevenueService.addRevenue(
      platformFee,
      'services',
      `Commission service - ${service.title} (${transaction.amount} FCFA)`,
      transactionId
    );

    logger.info('Paiement service confirmé', {
      transactionId,
      serviceId: service.id,
      providerEarnings,
      platformFee,
    });

    return {
      transaction,
      service,
    };
  }
}

export default new ServiceService();
