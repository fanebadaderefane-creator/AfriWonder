import prisma from '../config/database.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import { logger } from '../utils/logger.js';

export type MarketplacePlanType = 'free' | 'basic' | 'pro';
export type MarketplaceFeature = 'view_services' | 'contact_provider' | 'post_service' | 'priority_visibility';

type MarketplacePermissions = Record<MarketplaceFeature, boolean>;

const PLAN_TO_SUBSCRIPTION_TYPE: Record<MarketplacePlanType, string> = {
  free: 'marketplace_free',
  basic: 'marketplace_basic',
  pro: 'marketplace_pro',
};

const SUBSCRIPTION_TYPE_TO_PLAN: Record<string, MarketplacePlanType> = {
  marketplace_free: 'free',
  marketplace_basic: 'basic',
  marketplace_pro: 'pro',
};

const PLAN_PERMISSIONS: Record<MarketplacePlanType, MarketplacePermissions> = {
  free: {
    view_services: true,
    contact_provider: false,
    post_service: false,
    priority_visibility: false,
  },
  basic: {
    view_services: true,
    contact_provider: true,
    post_service: false,
    priority_visibility: false,
  },
  pro: {
    view_services: true,
    contact_provider: true,
    post_service: true,
    priority_visibility: true,
  },
};

class MarketplaceSubscriptionService {
  private normalizePlanType(input: string): MarketplacePlanType | null {
    const raw = String(input || '').trim().toLowerCase();
    if (raw === 'free' || raw === 'basic' || raw === 'pro') return raw;
    return null;
  }

  private addDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private getPlanPrice(planType: MarketplacePlanType): number {
    if (planType === 'basic') return 2500;
    if (planType === 'pro') return 7000;
    return 0;
  }

  getPlans() {
    return [
      {
        plan_type: 'free',
        label: 'FREE',
        price_xof: 0,
        features: PLAN_PERMISSIONS.free,
      },
      {
        plan_type: 'basic',
        label: 'BASIC',
        price_xof: 2500,
        features: PLAN_PERMISSIONS.basic,
      },
      {
        plan_type: 'pro',
        label: 'PRO',
        price_xof: 7000,
        features: PLAN_PERMISSIONS.pro,
      },
    ];
  }

  private async createFreeSubscription(userId: string) {
    return prisma.subscription.create({
      data: {
        user_id: userId,
        plan_type: PLAN_TO_SUBSCRIPTION_TYPE.free,
        status: 'active',
        start_date: new Date(),
        end_date: this.addDays(3650),
        auto_renew: true,
      },
    });
  }

  async getActiveMarketplaceSubscription(userId: string, createIfMissing: boolean = true) {
    const now = new Date();
    const marketplaceTypes = Object.values(PLAN_TO_SUBSCRIPTION_TYPE);
    let sub = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        plan_type: { in: marketplaceTypes },
        status: 'active',
      },
      orderBy: { created_at: 'desc' },
    });

    if (sub && sub.end_date && sub.end_date <= now) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });
      sub = null;
    }

    if (!sub && createIfMissing) {
      const pending = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          plan_type: { in: marketplaceTypes },
          status: 'pending',
        },
        orderBy: { created_at: 'desc' },
      });
      if (pending) return null;
      sub = await this.createFreeSubscription(userId);
    }

    return sub;
  }

  async getPlanAndPermissions(userId: string) {
    const sub = await this.getActiveMarketplaceSubscription(userId, true);
    const pending = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        plan_type: { in: Object.values(PLAN_TO_SUBSCRIPTION_TYPE) },
        status: 'pending',
      },
      orderBy: { created_at: 'desc' },
    });
    const plan = SUBSCRIPTION_TYPE_TO_PLAN[sub?.plan_type || 'marketplace_free'] || 'free';
    return {
      subscription: sub,
      pending_subscription: pending,
      plan_type: plan,
      permissions: PLAN_PERMISSIONS[plan],
    };
  }

  async checkAccess(userId: string, feature: MarketplaceFeature) {
    const state = await this.getPlanAndPermissions(userId);
    return {
      ...state,
      allowed: !!state.permissions[feature],
      feature,
    };
  }

  async subscribe(
    userId: string,
    rawPlanType: string,
    opts?: {
      payment_method?: 'orange_money';
      orange_money_phone?: string;
    },
  ) {
    const planType = this.normalizePlanType(rawPlanType);
    if (!planType) {
      throw new Error('plan_type invalide (free/basic/pro)');
    }

    const now = new Date();
    const end = this.addDays(planType === 'free' ? 3650 : 30);
    const marketplaceTypes = Object.values(PLAN_TO_SUBSCRIPTION_TYPE);
    const price = this.getPlanPrice(planType);

    if (planType === 'free') {
      await prisma.subscription.updateMany({
        where: {
          user_id: userId,
          plan_type: { in: marketplaceTypes },
          status: { in: ['active', 'pending'] },
        },
        data: { status: 'expired' },
      });

      const created = await prisma.subscription.create({
        data: {
          user_id: userId,
          plan_type: PLAN_TO_SUBSCRIPTION_TYPE[planType],
          status: 'active',
          start_date: now,
          end_date: end,
          auto_renew: true,
        },
      });

      return {
        subscription: created,
        plan_type: planType,
        permissions: PLAN_PERMISSIONS[planType],
        paymentStatus: 'free',
      };
    }

    if (opts?.payment_method && opts.payment_method !== 'orange_money') {
      throw new Error('Paiement marketplace disponible uniquement via Orange Money');
    }
    const phone = String(opts?.orange_money_phone || '').trim();
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      throw new Error('Numéro Orange Money valide requis');
    }

    await prisma.subscription.updateMany({
      where: {
        user_id: userId,
        plan_type: { in: marketplaceTypes },
        status: 'pending',
      },
      data: { status: 'cancelled' },
    });

    const created = await prisma.subscription.create({
      data: {
        user_id: userId,
        plan_type: PLAN_TO_SUBSCRIPTION_TYPE[planType],
        status: 'pending',
        start_date: now,
        end_date: end,
        auto_renew: true,
      },
    });

    const payment = await paymentService.initiateOrangeMoneyPayment(
      userId,
      created.id,
      {
        amount: price,
        phone,
        returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Marketplace?subscription=success`,
      },
      { useOrderPayment: false, transactionType: 'marketplace_subscription' },
    );

    logger.info('Marketplace subscription Orange Money initié', {
      subscriptionId: created.id,
      userId,
      planType,
      price,
    });

    return {
      subscription: created,
      plan_type: planType,
      permissions: PLAN_PERMISSIONS.free,
      paymentStatus: 'pending',
      paymentUrl: payment.paymentUrl,
      reference: payment.reference,
    };
  }

  async confirmSubscription(subscriptionId: string) {
    const marketplaceTypes = Object.values(PLAN_TO_SUBSCRIPTION_TYPE);
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription || !marketplaceTypes.includes(subscription.plan_type)) {
      throw new Error('Abonnement marketplace non trouvé');
    }

    if (subscription.status === 'active') return subscription;
    if (subscription.status !== 'pending') {
      throw new Error('Abonnement marketplace non confirmable');
    }

    const planType = SUBSCRIPTION_TYPE_TO_PLAN[subscription.plan_type] || 'free';
    const startDate = new Date();
    const endDate = this.addDays(planType === 'free' ? 3650 : 30);
    const price = this.getPlanPrice(planType);

    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: {
          user_id: subscription.user_id,
          plan_type: { in: marketplaceTypes },
          status: 'active',
          id: { not: subscriptionId },
        },
        data: { status: 'expired' },
      }),
      prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          start_date: startDate,
          end_date: endDate,
          auto_renew: true,
        },
      }),
      prisma.transaction.updateMany({
        where: {
          reference_id: subscriptionId,
          type: 'marketplace_subscription',
          status: 'pending',
        },
        data: { status: 'completed' },
      }),
    ]);

    if (price > 0) {
      await platformRevenueService.addRevenue(
        price,
        'subscriptions',
        `Abonnement marketplace ${planType} (${price.toLocaleString()} FCFA)`,
        subscriptionId,
      );
    }

    logger.info('Marketplace subscription confirmée', {
      subscriptionId,
      userId: subscription.user_id,
      planType,
    });

    return prisma.subscription.findUnique({ where: { id: subscriptionId } });
  }

  async adminList(page: number = 1, limit: number = 50) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = Math.max(0, (page - 1) * take);
    const marketplaceTypes = Object.values(PLAN_TO_SUBSCRIPTION_TYPE);
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where: { plan_type: { in: marketplaceTypes } },
        include: {
          user: {
            select: { id: true, username: true, full_name: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      prisma.subscription.count({
        where: { plan_type: { in: marketplaceTypes } },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async adminUpdateStatus(id: string, status: string) {
    if (!['active', 'expired', 'pending', 'cancelled'].includes(status)) {
      throw new Error('status invalide');
    }
    return prisma.subscription.update({
      where: { id },
      data: { status },
    });
  }
}

export default new MarketplaceSubscriptionService();
