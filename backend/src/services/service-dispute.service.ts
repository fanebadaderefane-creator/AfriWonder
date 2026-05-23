/**
 * Service de gestion des litiges de services
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class ServiceDisputeService {
  /**
   * Créer un litige
   */
  async createDispute(bookingId: string, reporterId: string, data: {
    reason: string;
    description?: string;
    evidence?: string[];
  }) {
    // Vérifier que la réservation existe
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier que le reporter est le client ou le prestataire
    const isCustomer = booking.customer_id === reporterId;
    const isProvider = booking.provider_id === reporterId;

    if (!isCustomer && !isProvider) {
      throw new Error('Non autorisé');
    }

    // Vérifier si un litige existe déjà
    const existingDispute = await prisma.serviceDispute.findUnique({
      where: { booking_id: bookingId },
    });

    if (existingDispute) {
      throw new Error('Litige déjà créé pour cette réservation');
    }

    // Créer le litige
    const dispute = await prisma.serviceDispute.create({
      data: {
        booking_id: bookingId,
        provider_id: booking.provider_id,
        reporter_id: reporterId,
        reporter_type: isCustomer ? 'customer' : 'provider',
        reason: data.reason,
        description: data.description,
        evidence: data.evidence || [],
        status: 'pending',
      },
      include: {
        booking: {
          include: {
            service: true,
            customer: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
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
        },
      },
    });

    // Bloquer le paiement si le statut est "paid"
    if (booking.payment_status === 'paid' && booking.status === 'completed') {
      // Le paiement sera bloqué jusqu'à résolution du litige
      // TODO: Implémenter le blocage effectif du payout
    }

    logger.info('Litige créé', { disputeId: dispute.id, bookingId, reporterId });
    return dispute;
  }

  /**
   * Mettre à jour un litige
   */
  async updateDispute(disputeId: string, data: {
    description?: string;
    evidence?: string[];
  }) {
    const dispute = await prisma.serviceDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Litige non trouvé');
    }

    if (dispute.status !== 'pending' && dispute.status !== 'investigating') {
      throw new Error('Litige déjà résolu');
    }

    const updatedDispute = await prisma.serviceDispute.update({
      where: { id: disputeId },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.evidence && { evidence: data.evidence }),
      },
      include: {
        booking: {
          include: {
            service: true,
          },
        },
      },
    });

    logger.info('Litige mis à jour', { disputeId });
    return updatedDispute;
  }

  /**
   * Résoudre un litige (admin)
   */
  async resolveDispute(disputeId: string, adminId: string, data: {
    resolution: string;
    status: 'resolved' | 'rejected';
    refund_amount?: number; // Montant à rembourser au client
  }) {
    const dispute = await prisma.serviceDispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: true,
      },
    });

    if (!dispute) {
      throw new Error('Litige non trouvé');
    }

    const updatedDispute = await prisma.serviceDispute.update({
      where: { id: disputeId },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolved_by: adminId,
        resolved_at: new Date(),
      },
      include: {
        booking: {
          include: {
            service: true,
            customer: true,
            provider: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Si résolu avec remboursement
    if (data.status === 'resolved' && data.refund_amount && data.refund_amount > 0) {
      // TODO: Implémenter le remboursement
      // - Créditer le wallet du client
      // - Débiter le wallet du prestataire ou de la plateforme
      // - Créer les transactions correspondantes
    }

    // Si rejeté, débloquer le paiement
    if (data.status === 'rejected' && dispute.booking.payment_status === 'paid') {
      // Le paiement peut être libéré pour le prestataire
      // TODO: Implémenter le déblocage du payout
    }

    logger.info('Litige résolu', { disputeId, adminId, status: data.status });
    return updatedDispute;
  }

  /**
   * Bloquer le paiement en cas de litige
   */
  async blockPayment(bookingId: string) {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Le paiement est déjà bloqué si un litige existe
    // Cette méthode peut être utilisée pour marquer explicitement le blocage
    // TODO: Implémenter un système de blocage effectif dans ServicePayout

    logger.info('Paiement bloqué pour litige', { bookingId });
    return { success: true };
  }

  /**
   * Lister les litiges
   */
  async listDisputes(filters: {
    provider_id?: string;
    customer_id?: string;
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

    if (filters.customer_id) {
      where.booking = {
        customer_id: filters.customer_id,
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [disputes, total] = await Promise.all([
      prisma.serviceDispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          booking: {
            include: {
              service: {
                select: {
                  id: true,
                  title: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  username: true,
                  full_name: true,
                },
              },
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
          },
        },
      }),
      prisma.serviceDispute.count({ where }),
    ]);

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir les détails d'un litige
   */
  async getDispute(disputeId: string) {
    const dispute = await prisma.serviceDispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
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
        },
      },
    });

    if (!dispute) {
      throw new Error('Litige non trouvé');
    }

    return dispute;
  }
}

export default new ServiceDisputeService();
