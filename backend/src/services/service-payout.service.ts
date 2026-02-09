/**
 * Service de gestion des payouts des prestataires
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import commissionService from './commission.service.js';

class ServicePayoutService {
  // Taux aligné sur config commissions (services 15-20%, défaut 17.5%)
  private get commissionRate() {
    return commissionService.getConfig('services').provider_commission_default_pct;
  }
  // Délai de payout par défaut : J+3 (3 jours après complétion)
  private readonly DEFAULT_PAYOUT_DELAY_DAYS = 3;

  /**
   * Calculer le montant disponible pour payout
   */
  async calculateAvailablePayout(providerId: string): Promise<{
    total_earnings: number;
    pending_payouts: number;
    available_for_payout: number;
    bookings: any[];
  }> {
    // Récupérer toutes les réservations complétées et payées
    const completedBookings = await prisma.serviceBooking.findMany({
      where: {
        provider_id: providerId,
        status: 'completed',
        payment_status: 'paid',
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { completed_at: 'asc' },
    });

    // Filtrer les réservations éligibles au payout (J+3)
    const now = new Date();
    const eligibleBookings = completedBookings.filter((booking) => {
      if (!booking.completed_at) return false;
      const payoutDate = new Date(booking.completed_at);
      payoutDate.setDate(payoutDate.getDate() + this.DEFAULT_PAYOUT_DELAY_DAYS);
      return payoutDate <= now;
    });

    // Vérifier quelles réservations sont déjà dans un payout
    const existingPayouts = await prisma.servicePayout.findMany({
      where: {
        provider_id: providerId,
        status: {
          in: ['pending', 'processing', 'completed'],
        },
      },
      select: {
        booking_ids: true,
      },
    });

    const bookedIds = new Set<string>();
    existingPayouts.forEach((payout) => {
      payout.booking_ids.forEach((id) => bookedIds.add(id));
    });

    // Filtrer les réservations non encore payées
    const availableBookings = eligibleBookings.filter(
      (booking) => !bookedIds.has(booking.id)
    );

    // Calculer les montants
    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + b.provider_earnings,
      0
    );
    const pendingPayouts = eligibleBookings
      .filter((b) => bookedIds.has(b.id))
      .reduce((sum, b) => sum + b.provider_earnings, 0);
    const availableForPayout = availableBookings.reduce(
      (sum, b) => sum + b.provider_earnings,
      0
    );

    return {
      total_earnings: totalEarnings,
      pending_payouts: pendingPayouts,
      available_for_payout: availableForPayout,
      bookings: availableBookings,
    };
  }

  /**
   * Créer un payout
   */
  async createPayout(providerId: string, bookingIds?: string[]) {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Prestataire non trouvé');
    }

    if (!provider.payout_method || !provider.payout_account) {
      throw new Error('Méthode de payout non configurée');
    }

    // Calculer le montant disponible
    const available = await this.calculateAvailablePayout(providerId);

    // Si des bookingIds spécifiques sont fournis, les utiliser
    let bookingsToPayout = available.bookings;
    if (bookingIds && bookingIds.length > 0) {
      bookingsToPayout = available.bookings.filter((b) =>
        bookingIds.includes(b.id)
      );
    }

    if (bookingsToPayout.length === 0) {
      throw new Error('Aucune réservation éligible pour payout');
    }

    // Calculer les montants
    const totalAmount = bookingsToPayout.reduce(
      (sum, b) => sum + b.provider_earnings,
      0
    );
    const commissionRate = this.commissionRate;
    const commissionAmount = totalAmount * commissionRate;
    const netAmount = totalAmount - commissionAmount;

    // Créer le payout
    const payout = await prisma.servicePayout.create({
      data: {
        provider_id: providerId,
        amount: totalAmount,
        currency: 'XOF',
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        status: 'pending',
        payout_method: provider.payout_method,
        payout_account: provider.payout_account,
        booking_ids: bookingsToPayout.map((b) => b.id),
      },
      include: {
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

    logger.info('Payout créé', {
      payoutId: payout.id,
      providerId,
      amount: netAmount,
      bookingCount: bookingsToPayout.length,
    });

    return payout;
  }

  /**
   * Traiter un payout
   */
  async processPayout(payoutId: string) {
    const payout = await prisma.servicePayout.findUnique({
      where: { id: payoutId },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payout) {
      throw new Error('Payout non trouvé');
    }

    if (payout.status !== 'pending') {
      throw new Error('Payout déjà traité');
    }

    // Mettre à jour le statut
    await prisma.servicePayout.update({
      where: { id: payoutId },
      data: {
        status: 'processing',
        processed_at: new Date(),
      },
    });

    // TODO: Intégrer avec le système de paiement externe
    // - Orange Money API
    // - MTN Money API
    // - Wave API
    // - Virement bancaire

    // Pour l'instant, on simule le traitement
    // En production, cela déclencherait l'appel API au PSP

    logger.info('Payout en cours de traitement', { payoutId });
    return payout;
  }

  /**
   * Confirmer qu'un payout est complété
   */
  async completePayout(payoutId: string) {
    const payout = await prisma.servicePayout.update({
      where: { id: payoutId },
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    logger.info('Payout complété', { payoutId, amount: payout.net_amount });
    return payout;
  }

  /**
   * Marquer un payout comme échoué
   */
  async failPayout(payoutId: string, reason: string) {
    const payout = await prisma.servicePayout.update({
      where: { id: payoutId },
      data: {
        status: 'failed',
        failure_reason: reason,
      },
    });

    logger.error('Payout échoué', { payoutId, reason });
    return payout;
  }

  /**
   * Obtenir l'historique des payouts d'un prestataire
   */
  async getPayoutHistory(providerId: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      provider_id: providerId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    const [payouts, total] = await Promise.all([
      prisma.servicePayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.servicePayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lister tous les payouts (admin)
   */
  async listAllPayouts(filters: {
    provider_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.provider_id) {
      where.provider_id = filters.provider_id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [payouts, total] = await Promise.all([
      prisma.servicePayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
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
      }),
      prisma.servicePayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new ServicePayoutService();
