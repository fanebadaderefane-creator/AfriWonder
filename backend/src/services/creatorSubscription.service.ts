/**
 * CDC Phase 1 - Premium créateur (Basic 1000, Pro 3000 FCFA/mois)
 * Le créateur paie pour activer son tier premium
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import ledgerService from './ledger.service.js';
import platformRevenueService from './platformRevenue.service.js';

export const CREATOR_TIERS = {
  basic: { price_fcfa: 1000, label: 'Basic' },
  /** Phase 9 — AfriWonder Pro (analytics avancés, no limit, badge). */
  pro: { price_fcfa: 2500, label: 'AfriWonder Pro' },
} as const;

class CreatorSubscriptionService {
  async subscribe(creatorId: string, tier: 'basic' | 'pro') {
    const tierConfig = CREATOR_TIERS[tier];
    if (!tierConfig) {
      const error: any = new Error('Tier invalide. Valeurs: basic, pro');
      error.statusCode = 400;
      throw error;
    }

    const wallet = await ledgerService.getOrCreateUserWallet(creatorId, 'XOF');
    const available = (wallet as any).available_balance ?? wallet.balance ?? 0;
    if (available < tierConfig.price_fcfa) {
      const error: any = new Error(`Solde insuffisant. Requis: ${tierConfig.price_fcfa} FCFA`);
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await ledgerService.debit(wallet.id, tierConfig.price_fcfa, {
      referenceType: 'other',
      description: `Abonnement créateur ${tierConfig.label}`,
    });

    const subscription = await prisma.creatorSubscription.create({
      data: {
        creator_id: creatorId,
        tier,
        price_fcfa: tierConfig.price_fcfa,
        status: 'active',
        starts_at: now,
        expires_at: expiresAt,
        payment_method: 'wallet',
      },
    });

    if (tier === 'pro') {
      await prisma.user.update({
        where: { id: creatorId },
        data: { is_afriwonder_pro: true },
      });
    }

    await platformRevenueService.addRevenue(
      tierConfig.price_fcfa,
      'gifts_tips',
      `Abonnement créateur ${tierConfig.label} (${tierConfig.price_fcfa} FCFA)`,
      subscription.id
    );

    logger.info('Creator subscription created', {
      subscriptionId: subscription.id,
      creatorId,
      tier,
      expiresAt,
    });

    return subscription;
  }

  async getActiveSubscription(creatorId: string) {
    const now = new Date();
    return prisma.creatorSubscription.findFirst({
      where: {
        creator_id: creatorId,
        status: 'active',
        expires_at: { gt: now },
      },
      orderBy: { expires_at: 'desc' },
    });
  }

  async expireSubscriptions() {
    const now = new Date();
    const toExpire = await prisma.creatorSubscription.findMany({
      where: { status: 'active', expires_at: { lt: now } },
      select: { creator_id: true, tier: true },
    });
    if (toExpire.length === 0) return 0;

    const result = await prisma.creatorSubscription.updateMany({
      where: { status: 'active', expires_at: { lt: now } },
      data: { status: 'expired' },
    });

    const proCreators = [...new Set(toExpire.filter((t) => t.tier === 'pro').map((t) => t.creator_id))];
    for (const cid of proCreators) {
      const still = await prisma.creatorSubscription.findFirst({
        where: { creator_id: cid, status: 'active', tier: 'pro', expires_at: { gt: now } },
      });
      if (!still) {
        await prisma.user.update({ where: { id: cid }, data: { is_afriwonder_pro: false } }).catch(() => {});
      }
    }

    if (result.count > 0) {
      logger.info('Creator subscriptions expired', { count: result.count });
    }
    return result.count;
  }
}

export const creatorSubscriptionService = new CreatorSubscriptionService();
export default creatorSubscriptionService;
