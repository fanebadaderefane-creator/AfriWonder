/**
 * Service de gestion des réservations de services
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import notificationService from './notification.service.js';
import providerService from './provider.service.js';

class BookingService {
  // Acompte par défaut : 30% du montant total
  private readonly DEFAULT_DEPOSIT_RATE = 0.3;

  /**
   * Créer une réservation
   */
  async createBooking(serviceId: string, customerId: string, data: {
    booking_date: Date;
    booking_time: string; // Format HH:mm
    location_type: 'customer_address' | 'provider_location';
    customer_address_id?: string;
    notes?: string;
    payment_method: string;
    deposit_only?: boolean; // Si true, ne paie que l'acompte
    phone?: string; // Phone number for mobile money payments
  }) {
    // Vérifier le service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!service || !service.is_available) {
      throw new Error('Service non disponible');
    }

    // Calculer les montants. Phase 1: MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY → 0% commission (abonnements uniquement)
    const totalPrice = service.price + (service.travel_fee || 0);
    let platformFee = 0;
    let providerEarnings = totalPrice;
    if (process.env.MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY !== 'true') {
      const commissionService = (await import('./commission.service.js')).default;
      const calc = commissionService.servicesProvider(totalPrice);
      platformFee = calc.platform;
      providerEarnings = calc.provider;
    }
    const depositAmount = data.deposit_only
      ? totalPrice * this.DEFAULT_DEPOSIT_RATE
      : totalPrice;

    // Créer la réservation
    const booking = await prisma.serviceBooking.create({
      data: {
        service_id: serviceId,
        customer_id: customerId,
        provider_id: service.provider_id,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        duration: service.duration || 60,
        location_type: data.location_type,
        customer_address_id: data.customer_address_id,
        total_price: totalPrice,
        platform_fee: platformFee,
        provider_earnings: providerEarnings,
        deposit_amount: depositAmount,
        deposit_paid: false,
        payment_method: data.payment_method,
        notes: data.notes,
        status: 'pending',
        payment_status: 'pending',
      },
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    // Initier le paiement
    try {
      let paymentResult;
      
      if (data.payment_method === 'orange_money' || data.payment_method === 'mtn_money' || data.payment_method === 'wave') {
        if (!data.phone) throw new Error('Numéro de téléphone requis pour le paiement Mobile Money');
        // Paiement Mobile Money
        paymentResult = await paymentService.initiateOrangeMoneyPayment(
          customerId,
          booking.id,
          {
            amount: depositAmount,
            phone: data.phone,
            returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/bookings/${booking.id}?payment=success`,
          }
        );
      } else if (data.payment_method === 'wallet') {
        const ledgerService = (await import('./ledger.service.js')).default;
        const wallet = await ledgerService.getOrCreateUserWallet(customerId, 'XOF');
        const available = (wallet as any).available_balance ?? wallet.balance;
        if (available < depositAmount) throw new Error('Solde insuffisant');
        await ledgerService.debit(wallet.id, depositAmount, {
          referenceType: 'other',
          description: `Réservation service - dépôt`,
        });

        // Créer transaction
        const transaction = await prisma.transaction.create({
          data: {
            user_id: customerId,
            type: 'service_booking',
            amount: depositAmount,
            currency: 'XOF',
            status: 'completed',
            payment_method: 'wallet',
            description: `Réservation service - ${service.title}`,
            reference_id: booking.id,
          },
        });

        // Mettre à jour la réservation
        await prisma.serviceBooking.update({
          where: { id: booking.id },
          data: {
            payment_transaction_id: transaction.id,
            deposit_paid: true,
            payment_status: depositAmount === totalPrice ? 'paid' : 'partial',
          },
        });

        paymentResult = { success: true, transactionId: transaction.id };
      } else {
        throw new Error('Méthode de paiement non supportée');
      }

      // Notifier le prestataire
      try {
        await notificationService.create(service.provider.user_id, {
          type: 'service_booking_new',
          title: 'Nouvelle réservation',
          message: `Nouvelle réservation pour ${service.title} le ${data.booking_date.toLocaleDateString()} à ${data.booking_time}`,
          reference_type: 'booking',
          reference_id: booking.id,
        });
      } catch (err) {
        logger.warn('Erreur notification nouvelle réservation', { bookingId: booking.id, err });
      }

      logger.info('Réservation créée', {
        bookingId: booking.id,
        serviceId,
        customerId,
        amount: depositAmount,
      });

      return {
        booking,
        payment: paymentResult,
      };
    } catch (error: any) {
      // En cas d'erreur, supprimer la réservation
      await prisma.serviceBooking.delete({
        where: { id: booking.id },
      });

      throw error;
    }
  }

  /**
   * Confirmer une réservation (prestataire)
   */
  async confirmBooking(bookingId: string, providerId: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    if (booking.provider_id !== providerId) {
      throw new Error('Non autorisé');
    }

    if (booking.status !== 'pending') {
      throw new Error('Réservation déjà traitée');
    }

    const updatedBooking = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        confirmed_at: new Date(),
      },
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    // Notifier le client
    try {
      await notificationService.create(booking.customer_id, {
        type: 'service_booking_confirmed',
        title: 'Réservation confirmée',
        message: `Votre réservation pour ${booking.service.title} a été confirmée`,
        reference_type: 'booking',
        reference_id: bookingId,
      });
    } catch (err) {
      logger.warn('Erreur notification confirmation réservation', { bookingId, err });
    }

    logger.info('Réservation confirmée', { bookingId, providerId });
    return updatedBooking;
  }

  /**
   * Mettre à jour le statut d'une réservation
   */
  async updateBookingStatus(bookingId: string, userId: string, status: 'in_progress' | 'completed' | 'cancelled' | 'no_show', reason?: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier les permissions
    const isCustomer = booking.customer_id === userId;
    const provider = await providerService.getProviderByUserId(userId);
    const isProvider = provider && provider.id === booking.provider_id;
    const isAdmin = false; // TODO: vérifier rôle admin

    if (!isCustomer && !isProvider && !isAdmin) {
      throw new Error('Non autorisé');
    }

    const updateData: any = {
      status,
    };

    if (status === 'in_progress') {
      updateData.started_at = new Date();
    } else if (status === 'completed') {
      updateData.completed_at = new Date();
      // Si paiement partiel, compléter le paiement
      if (booking.payment_status === 'partial') {
        updateData.payment_status = 'paid';
        // TODO: Déclencher le paiement du solde
      }
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date();
      updateData.cancellation_reason = reason;
      updateData.cancelled_by = isCustomer ? 'customer' : isProvider ? 'provider' : 'admin';
      // TODO: Gérer le remboursement selon la politique d'annulation
    }

    const updatedBooking = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    logger.info('Statut réservation modifié', { bookingId, status, userId });
    return updatedBooking;
  }

  /**
   * Annuler une réservation
   */
  async cancelBooking(bookingId: string, userId: string, reason: string) {
    return this.updateBookingStatus(bookingId, userId, 'cancelled', reason);
  }

  /**
   * Obtenir les détails d'une réservation
   */
  async getBooking(bookingId: string, userId?: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                full_name: true,
                profile_image: true,
              },
            },
          },
        },
        customer_address: true,
        provider_address: true,
        review: true,
      },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier les permissions si userId fourni
    if (userId && booking.customer_id !== userId && booking.provider_id !== userId) {
      // TODO: Vérifier si admin
      throw new Error('Non autorisé');
    }

    return booking;
  }

  /**
   * Lister les réservations
   */
  async listBookings(filters: {
    customer_id?: string;
    provider_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.customer_id) {
      where.customer_id = filters.customer_id;
    }

    if (filters.provider_id) {
      where.provider_id = filters.provider_id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [bookings, total] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { booking_date: 'desc' },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
          customer: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
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
      }),
      prisma.serviceBooking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Confirmer le paiement d'une réservation (webhook ou admin)
   */
  async confirmPayment(bookingId: string, transactionId: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Mettre à jour le statut de paiement
    const isFullPayment = booking.deposit_amount === booking.total_price;
    
    await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        payment_transaction_id: transactionId,
        deposit_paid: true,
        payment_status: isFullPayment ? 'paid' : 'partial',
      },
    });

    logger.info('Paiement réservation confirmé', {
      bookingId,
      transactionId,
      amount: booking.deposit_amount,
    });

    return booking;
  }

  /**
   * Compléter une réservation et créditer le prestataire
   */
  async completeBooking(bookingId: string, providerId: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    if (booking.provider_id !== providerId) {
      throw new Error('Non autorisé');
    }

    if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
      throw new Error('Réservation non en cours');
    }

    // Mettre à jour le statut
    const updatedBooking = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
    });

    // Si paiement complet, créditer le prestataire
    if (booking.payment_status === 'paid') {
      // Créditer le wallet du prestataire (utiliser SellerWallet pour l'instant)
      const sellerWallet = await withdrawalService.getSellerWallet(providerId);
      
      await prisma.sellerWallet.update({
        where: { id: sellerWallet.id },
        data: {
          balance: {
            increment: booking.provider_earnings,
          },
        },
      });

      // Créer transaction pour le prestataire
      await prisma.transaction.create({
        data: {
          user_id: providerId,
          type: 'service_received',
          amount: booking.provider_earnings,
          currency: 'XOF',
          status: 'completed',
          description: `Service réservé - ${booking.service.title} (${booking.total_price} FCFA - commission: ${booking.platform_fee} FCFA)`,
          reference_id: bookingId,
          payment_method: 'internal',
        },
      });

      // Créditer la plateforme (commission) — Phase 1: 0 si abonnements uniquement
      if (booking.platform_fee > 0) {
        await platformRevenueService.addRevenue(
          booking.platform_fee,
          'services',
          `Commission service - ${booking.service.title} (${booking.total_price} FCFA)`,
          bookingId
        );
      }

      // Mettre à jour les stats du prestataire
      await providerService.updateStats(providerId);
    }

    logger.info('Réservation complétée', { bookingId, providerId });
    return updatedBooking;
  }
}

export default new BookingService();
