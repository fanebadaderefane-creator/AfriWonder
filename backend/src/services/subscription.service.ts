import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import commissionService from './commission.service.js';

/**
 * Service pour gérer les abonnements aux créateurs
 * Commission plateforme : 20% (80% créateur) — modèle AfriWonder
 */
class SubscriptionService {
  // Abonnements créateurs : 20% plateforme (80% créateur) — modèle AfriWonder

  /**
   * Créer un tier d'abonnement
   */
  async createTier(creatorId: string, data: {
    name: string;
    price: number;
    benefits: string[];
  }) {
    const tier = await prisma.subscriptionTier.create({
      data: {
        creator_id: creatorId,
        name: data.name,
        price: data.price,
        benefits: data.benefits,
        is_active: true,
      },
    });

    logger.info('Tier d\'abonnement créé', { tierId: tier.id, creatorId });
    return tier;
  }

  /**
   * S'abonner à un créateur
   */
  async subscribe(userId: string, tierId: string, data: {
    phone: string;
  }) {
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier || !tier.is_active) {
      throw new Error('Tier d\'abonnement non disponible');
    }

    const creator = await prisma.user.findUnique({
      where: { id: tier.creator_id },
      select: { username: true },
    });

    // Vérifier si l'utilisateur n'est pas déjà abonné
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        tier_id: tierId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      throw new Error('Vous êtes déjà abonné à ce tier');
    }

    // Calculer les montants
    const { platform: platformFee, creator: creatorEarnings } = commissionService.videoSocialCreatorSubscription(tier.price);

    // Créer l'abonnement en attente
    const subscription = await prisma.subscription.create({
      data: {
        user_id: userId,
        tier_id: tierId,
        plan_type: 'creator',
        status: 'pending',
        start_date: new Date(),
        auto_renew: true,
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'subscription',
        amount: tier.price,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Abonnement - ${tier.name} (${creator?.username ?? tier.creator_id})`,
        reference_id: subscription.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        userId,
        subscription.id,
        {
          amount: tier.price,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/creators/${tier.creator_id}?subscription=success`,
        }
      );

      logger.info('Abonnement créé et paiement Orange Money initié', {
        subscriptionId: subscription.id,
        userId,
        tierId,
        amount: tier.price,
      });

      return {
        ...subscription,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      // En cas d'erreur, supprimer l'abonnement
      await prisma.subscription.delete({
        where: { id: subscription.id },
      });

      await prisma.transaction.delete({
        where: { id: transaction.id },
      });

      throw error;
    }
  }

  /**
   * Confirmer un abonnement après paiement Orange Money
   */
  async confirmSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tier: true },
    });

    if (!subscription) {
      throw new Error('Abonnement non trouvé');
    }

    const tier = subscription.tier;
    if (!tier) throw new Error('Tier introuvable pour cet abonnement');

    // Calculer les montants
    const { platform: platformFee, creator: creatorEarnings } = commissionService.videoSocialCreatorSubscription(tier.price);

    // Mettre à jour la transaction
    await prisma.transaction.updateMany({
      where: {
        reference_id: subscriptionId,
        type: 'subscription',
      },
      data: {
        status: 'completed',
      },
    });

    // Créditer le wallet du créateur
    const sellerWallet = await withdrawalService.getSellerWallet(tier.creator_id);
    
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
        user_id: tier.creator_id,
        type: 'subscription_received',
        amount: creatorEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Abonnement reçu - ${tier.name} (${tier.price} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: subscriptionId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 20% — abonnements créateurs)
    await platformRevenueService.addRevenue(
      platformFee,
      'subscriptions',
      `Commission abonnement - ${tier.name} (${tier.price} FCFA)`,
      subscriptionId
    );

    // Mettre à jour le statut de l'abonnement
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 mois

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        start_date: new Date(),
        end_date: endDate,
      },
    });

    logger.info('Abonnement confirmé', {
      subscriptionId,
      creatorId: tier.creator_id,
      creatorEarnings,
      platformFee,
    });

    return subscription;
  }

  /**
   * Renouveler un abonnement (auto-renew)
   */
  async renewSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tier: true },
    });

    if (!subscription || !subscription.auto_renew) {
      throw new Error('Abonnement non renouvelable');
    }

    if (subscription.status !== 'active') {
      throw new Error('Abonnement non actif');
    }

    const tierForRenew = subscription.tier;
    if (!tierForRenew) throw new Error('Tier introuvable');

    // Créer une nouvelle transaction pour le renouvellement
    const transaction = await prisma.transaction.create({
      data: {
        user_id: subscription.user_id,
        type: 'subscription_renewal',
        amount: tierForRenew.price,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        description: `Renouvellement abonnement - ${tierForRenew.name}`,
        reference_id: subscriptionId,
      },
    });

    // Note: Le paiement Orange Money doit être initié depuis le frontend
    // Cette fonction crée juste la transaction

    return {
      subscription,
      transaction,
    };
  }

  /**
   * Obtenir les abonnements d'un utilisateur
   */
  async getUserSubscriptions(userId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { user_id: userId },
      include: { tier: true },
      orderBy: { created_at: 'desc' },
    });

    return subscriptions;
  }

  /**
   * Obtenir les abonnés d'un créateur
   */
  async getCreatorSubscribers(creatorId: string) {
    const tiers = await prisma.subscriptionTier.findMany({
      where: { creator_id: creatorId },
      select: { id: true },
    });

    const tierIds = tiers.map(t => t.id);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        tier_id: { in: tierIds },
        status: 'active',
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
        tier: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return subscriptions;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;

