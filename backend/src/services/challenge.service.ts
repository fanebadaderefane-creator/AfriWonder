import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';

class ChallengeService {
  async list(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    search?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.challenge.count({ where }),
    ]);

    return {
      challenges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(creatorId: string, data: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    prize?: string;
  }) {
    const challenge = await prisma.challenge.create({
      data: {
        creator_id: creatorId,
        title: data.title,
        description: data.description,
        start_date: data.startDate,
        end_date: data.endDate,
        prize: data.prize,
        status: 'active',
      },
    });

    logger.info('Challenge created', { creatorId, challengeId: challenge.id });
    return challenge;
  }

  // Commission plateforme : 10% sur participation payante
  private readonly PLATFORM_COMMISSION_RATE = 0.1;

  /**
   * Participer à un challenge payant
   */
  async participate(challengeId: string, userId: string, data: {
    phone: string;
    participationFee: number;
  }) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== 'active') {
      throw new Error('Challenge not found or not active');
    }

    // Calculer les montants
    const platformFee = data.participationFee * this.PLATFORM_COMMISSION_RATE;
    const creatorEarnings = data.participationFee - platformFee;

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'challenge_participation',
        amount: data.participationFee,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Participation challenge - ${challenge.title}`,
        reference_id: challengeId,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        userId,
        transaction.id,
        {
          amount: data.participationFee,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/challenges/${challengeId}?participation=success`,
        }
      );

      logger.info('Challenge participation created and Orange Money payment initiated', {
        challengeId,
        userId,
        amount: data.participationFee,
      });

      return {
        transactionId: transaction.id,
        challengeId,
        paymentUrl: paymentResult.paymentUrl,
      };
    } catch (error: any) {
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Confirmer la participation payante à un challenge
   */
  async confirmParticipation(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'challenge_participation') {
      throw new Error('Transaction not found or invalid type');
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: transaction.reference_id! },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Calculer les montants
    const platformFee = transaction.amount * this.PLATFORM_COMMISSION_RATE;
    const creatorEarnings = transaction.amount - platformFee;

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
      },
    });

    // Créditer le wallet du créateur
    const sellerWallet = await withdrawalService.getSellerWallet(challenge.creator_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: creatorEarnings,
        },
      },
    });

    // Créer transaction pour le créateur
    await prisma.transaction.create({
      data: {
        user_id: challenge.creator_id,
        type: 'challenge_received',
        amount: creatorEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Participation reçue - Challenge ${challenge.title} (${transaction.amount} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: transactionId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 10%)
    await platformRevenueService.addRevenue(
      platformFee,
      'challenges',
      `Commission challenge - ${challenge.title} (${transaction.amount} FCFA)`,
      transactionId
    );

    // Mettre à jour le compteur de participants
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        participants_count: { increment: 1 },
      },
    });

    logger.info('Challenge participation confirmed', {
      transactionId,
      challengeId: challenge.id,
      creatorEarnings,
      platformFee,
    });

    return {
      transaction,
      challenge,
    };
  }
}

export default new ChallengeService();

