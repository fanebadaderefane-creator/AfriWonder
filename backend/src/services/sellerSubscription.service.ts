/**
 * Phase 1 Marketplace - Abonnements vendeurs (subscriptions only, no commission)
 * Paiement : wallet OU Orange Money (numéro valide)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import ledgerService from './ledger.service.js';
import platformRevenueService from './platformRevenue.service.js';
import sellerProfileService from './sellerProfile.service.js';
import paymentService from './payment.service.js';

export const SELLER_TIER_PRICES: Record<string, number> = {
  free: 0,
  starter: 10_000,
  business: 30_000,
  enterprise: 50_000,
};

const PAID_TIERS = ['starter', 'business', 'enterprise'] as const;

function normalizeOrangePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 8 && cleaned.length <= 12) return cleaned;
  if (phone.startsWith('+') || phone.startsWith('223')) return cleaned.slice(-8);
  return cleaned;
}

class SellerSubscriptionService {
  async subscribe(sellerId: string, tier: 'starter' | 'business' | 'enterprise', paymentMethod: 'wallet' | 'orange_money' = 'wallet', orangeMoneyPhone?: string) {
    const priceFcfa = SELLER_TIER_PRICES[tier];
    if (priceFcfa == null || priceFcfa <= 0) {
      const error: any = new Error('Tier invalide ou gratuit');
      error.statusCode = 400;
      throw error;
    }

    const profile = await sellerProfileService.getByUserId(sellerId);
    if (!profile) {
      const error: any = new Error('Profil vendeur non trouvé');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    if (paymentMethod === 'orange_money') {
      if (!orangeMoneyPhone || orangeMoneyPhone.trim().length < 8) {
        const error: any = new Error('Numéro Orange Money valide requis (ex: 70123456 ou +22370123456)');
        error.statusCode = 400;
        throw error;
      }
      const phone = normalizeOrangePhone(orangeMoneyPhone);

      const subscription = await prisma.sellerSubscription.create({
        data: {
          seller_id: sellerId,
          tier,
          price_fcfa: priceFcfa,
          status: 'pending',
          starts_at: now,
          expires_at: expiresAt,
          payment_method: 'orange_money',
        },
      });

      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        sellerId,
        subscription.id,
        {
          amount: priceFcfa,
          phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/seller-subscription?success=1`,
        },
        { useOrderPayment: false, transactionType: 'seller_subscription' }
      );

      logger.info('Seller subscription Orange Money initié', {
        subscriptionId: subscription.id,
        sellerId,
        tier,
      });

      return {
        ...subscription,
        paymentUrl: paymentResult.paymentUrl,
        paymentStatus: 'pending',
      };
    }

    // Paiement wallet
    const wallet = await ledgerService.getOrCreateUserWallet(sellerId, 'XOF');
    const available = (wallet as any).available_balance ?? (wallet as any).balance ?? 0;
    if (available < priceFcfa) {
      const error: any = new Error(`Solde insuffisant. Requis: ${priceFcfa.toLocaleString()} FCFA. Utilisez Orange Money si besoin.`);
      error.statusCode = 400;
      throw error;
    }

    await ledgerService.debit(wallet.id, priceFcfa, {
      referenceType: 'other',
      description: `Abonnement vendeur ${tier}`,
    });

    const subscription = await prisma.sellerSubscription.create({
      data: {
        seller_id: sellerId,
        tier,
        price_fcfa: priceFcfa,
        status: 'active',
        starts_at: now,
        expires_at: expiresAt,
        payment_method: 'wallet',
      },
    });

    await prisma.sellerProfile.update({
      where: { user_id: sellerId },
      data: { subscription_tier: tier },
    });

    await platformRevenueService.addRevenue(
      priceFcfa,
      'subscriptions',
      `Abonnement vendeur ${tier} (${priceFcfa.toLocaleString()} FCFA)`,
      subscription.id
    );

    logger.info('Seller subscription created', {
      subscriptionId: subscription.id,
      sellerId,
      tier,
      expiresAt,
    });

    return subscription;
  }

  async confirmSubscription(subscriptionId: string) {
    const subscription = await prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Abonnement non trouvé');
    }
    if (subscription.status !== 'pending') {
      return subscription;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await prisma.$transaction([
      prisma.sellerSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          starts_at: now,
          expires_at: expiresAt,
        },
      }),
      prisma.sellerProfile.update({
        where: { user_id: subscription.seller_id },
        data: { subscription_tier: subscription.tier },
      }),
    ]);

    await prisma.transaction.updateMany({
      where: {
        reference_id: subscriptionId,
        type: 'seller_subscription',
        status: 'pending',
      },
      data: { status: 'completed' },
    });

    await platformRevenueService.addRevenue(
      subscription.price_fcfa,
      'subscriptions',
      `Abonnement vendeur ${subscription.tier} (${subscription.price_fcfa.toLocaleString()} FCFA)`,
      subscriptionId
    );

    logger.info('Seller subscription confirmé (Orange Money)', {
      subscriptionId,
      sellerId: subscription.seller_id,
      tier: subscription.tier,
    });

    return prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
    });
  }

  async getActiveSubscription(sellerId: string) {
    const now = new Date();
    return prisma.sellerSubscription.findFirst({
      where: {
        seller_id: sellerId,
        status: 'active',
        expires_at: { gt: now },
      },
      orderBy: { expires_at: 'desc' },
    });
  }

  async expireSubscriptions() {
    const now = new Date();
    const expired = await prisma.sellerSubscription.findMany({
      where: {
        status: 'active',
        expires_at: { lt: now },
      },
      select: { id: true, seller_id: true },
    });

    if (expired.length === 0) return 0;

    const sellerIds = [...new Set(expired.map((s) => s.seller_id))];
    await prisma.$transaction([
      prisma.sellerSubscription.updateMany({
        where: { id: { in: expired.map((s) => s.id) } },
        data: { status: 'expired' },
      }),
      prisma.sellerProfile.updateMany({
        where: { user_id: { in: sellerIds } },
        data: { subscription_tier: 'free' },
      }),
    ]);

    logger.info('Seller subscriptions expired', { count: expired.length });
    return expired.length;
  }
}

export const sellerSubscriptionService = new SellerSubscriptionService();
export default sellerSubscriptionService;
