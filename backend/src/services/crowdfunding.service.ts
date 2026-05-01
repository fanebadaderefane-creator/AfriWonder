import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { isAdminRole } from '../middleware/adminRbac.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import ledgerService from './ledger.service.js';
import verificationService from './verification.service.js';

class CrowdfundingService {
  /**
   * Créateur de la campagne ou admin — pour jalons, release escrow, remboursement échec.
   */
  private async ensureCanManageCampaign(campaignId: string, userId: string, userRole?: string | null) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!c) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    const isAdmin = userRole === 'admin' || userRole === 'ADMIN';
    if (c.creator_id !== userId && !isAdmin) {
      const err: any = new Error('Non autorisé');
      err.statusCode = 403;
      throw err;
    }
    return c;
  }

  /** Paliers affichés côté mobile (seedés à la création). */
  private normalizeRewardsData(raw: unknown): Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    claimed: number;
    limit: number;
    deliveryDate: string;
    icon: string;
  }> {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((item: any, i: number) => ({
      id: String(item?.id ?? `r${i + 1}`),
      title: String(item?.title ?? 'Récompense'),
      description: String(item?.description ?? ''),
      amount: Math.max(0, Number(item?.amount) || 0),
      claimed: Math.max(0, Number(item?.claimed) || 0),
      limit: Math.max(0, Number(item?.limit) || 0) || 999,
      deliveryDate: String(item?.deliveryDate ?? item?.delivery_date ?? ''),
      icon: String(item?.icon ?? 'gift'),
    }));
  }

  async list(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    search?: string;
    category?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ['active', 'funded', 'failed'] };
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    const creatorIds = [...new Set(rows.map((c) => c.creator_id))];
    const creators =
      creatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, full_name: true, username: true, profile_image: true, email: true },
          })
        : [];
    const byCreator = Object.fromEntries(
      creators.map((u) => [
        u.id,
        u.full_name?.trim() || u.username?.trim() || u.email?.split('@')[0] || 'Créateur',
      ]),
    );
    const avatarByCreator = Object.fromEntries(
      creators.map((u) => [u.id, u.profile_image ?? undefined]),
    );

    const campaigns = rows.map((c) => {
      const { rewards_data: _r, ...rest } = c;
      return {
        ...rest,
        rewards: this.normalizeRewardsData(c.rewards_data),
        creator_name: byCreator[c.creator_id] ?? 'Créateur',
        creator_avatar: avatarByCreator[c.creator_id],
        image_url: c.cover_image ?? undefined,
      };
    });

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /** Détail public : campagnes masquées (pending, etc.) sauf créateur / admin. */
  private canViewCampaignDetail(
    c: { status: string; creator_id: string },
    viewer?: { userId: string; role?: string | null },
  ): boolean {
    const s = c.status;
    if (s === 'active' || s === 'funded' || s === 'failed') return true;
    if (!viewer) return false;
    if (viewer.userId === c.creator_id) return true;
    if (isAdminRole(viewer.role || '')) return true;
    return false;
  }

  async getById(campaignId: string, viewer?: { userId: string; role?: string | null }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contributions: {
          take: 20,
          orderBy: { created_at: 'desc' },
        },
        _count: { select: { cf_updates: true, cf_comments: true } },
      },
    });
    if (!campaign) return null;
    if (!this.canViewCampaignDetail(campaign, viewer)) return null;
    const creator = await prisma.user.findUnique({
      where: { id: campaign.creator_id },
      select: {
        id: true,
        full_name: true,
        profile_image: true,
        email: true,
        username: true,
        country: true,
      },
    });
    const rewards = this.normalizeRewardsData(campaign.rewards_data);
    const creatorLabel =
      creator?.full_name?.trim() || creator?.username?.trim() || creator?.email?.split('@')[0] || 'Créateur';
    const { rewards_data: _rawRewards, _count, ...campaignRest } = campaign;
    return {
      ...campaignRest,
      rewards,
      updates_count: _count?.cf_updates ?? 0,
      comments_count: _count?.cf_comments ?? 0,
      image_url: campaign.cover_image ?? undefined,
      creator_id: campaign.creator_id,
      creator_name: creatorLabel,
      creator_avatar: creator?.profile_image ?? undefined,
      creator: {
        id: campaign.creator_id,
        name: creatorLabel,
        avatar: creator?.profile_image ?? undefined,
        location: creator?.country ? `${creator.country}` : 'Bamako, Mali',
        isVerified: campaign.kyc_verified,
        projectsCount: 1,
        successRate: 100,
      },
    };
  }

  /** Campagnes créées par l'utilisateur (dashboard porteur). */
  async listMyCampaigns(creatorId: string) {
    const rows = await prisma.campaign.findMany({
      where: { creator_id: creatorId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return {
      campaigns: rows.map((c) => {
        const { rewards_data, ...rest } = c;
        return {
          ...rest,
          rewards: this.normalizeRewardsData(rewards_data),
          image_url: c.cover_image ?? undefined,
        };
      }),
    };
  }

  /** Contributions de l'utilisateur (historique investisseur). */
  async listMyContributions(contributorId: string) {
    const rows = await prisma.contribution.findMany({
      where: { contributor_id: contributorId },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        campaign: true,
      },
    });
    return {
      contributions: rows.map((c) => ({
        id: c.id,
        amount: c.amount,
        status: c.status,
        reward_tier: c.reward_tier,
        created_at: c.created_at,
        campaign: c.campaign
          ? {
              id: c.campaign.id,
              title: c.campaign.title,
              current_amount: c.campaign.current_amount,
              goal_amount: c.campaign.goal_amount,
              end_date: c.campaign.end_date,
              status: c.campaign.status,
              category: c.campaign.category,
              cover_image: c.campaign.cover_image,
            }
          : null,
      })),
    };
  }

  /** Contributions confirmées pour une campagne (soutiens publics, sans données de paiement). */
  async listCampaignContributions(
    campaignId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { campaign_id: campaignId, status: 'completed' as const };
    const [rows, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contribution.count({ where }),
    ]);
    const userIds = [...new Set(rows.map((r) => r.contributor_id))];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, full_name: true, username: true, profile_image: true },
          })
        : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    return {
      contributions: rows.map((c) => {
        const u = byId[c.contributor_id];
        return {
          id: c.id,
          amount: c.amount,
          reward_tier: c.reward_tier,
          created_at: c.created_at,
          contributor: {
            id: c.contributor_id,
            display_name: u?.full_name?.trim() || u?.username?.trim() || 'Contributeur',
            avatar: u?.profile_image ?? null,
          },
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /** Derniers soutiens sur les campagnes du créateur (dashboard). */
  async listRecentContributorsForCreator(creatorId: string, limit: number = 40) {
    const campaigns = await prisma.campaign.findMany({
      where: { creator_id: creatorId },
      select: { id: true, title: true },
    });
    const campaignIds = campaigns.map((c) => c.id);
    const titleByCampaignId = Object.fromEntries(campaigns.map((c) => [c.id, c.title]));
    if (campaignIds.length === 0) {
      return { contributors: [] };
    }

    const rows = await prisma.contribution.findMany({
      where: { campaign_id: { in: campaignIds }, status: 'completed' },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    const userIds = [...new Set(rows.map((r) => r.contributor_id))];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, full_name: true, username: true, profile_image: true },
          })
        : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));

    return {
      contributors: rows.map((c) => {
        const u = byId[c.contributor_id];
        return {
          id: c.id,
          amount: c.amount,
          reward_tier: c.reward_tier,
          created_at: c.created_at,
          campaign_id: c.campaign_id,
          project_title: titleByCampaignId[c.campaign_id] ?? 'Campagne',
          contributor: {
            id: c.contributor_id,
            display_name: u?.full_name?.trim() || u?.username?.trim() || 'Contributeur',
            avatar: u?.profile_image ?? null,
          },
        };
      }),
    };
  }

  async create(creatorId: string, data: {
    title: string;
    description: string;
    goalAmount: number;
    endDate: Date;
    category?: string;
    coverImage?: string;
    cover_image?: string;
    rewards?: unknown[];
  }) {
    const strictKyc = process.env.STRICT_KYC_FINANCE === 'true';
    if (strictKyc) {
      const kycOk = await verificationService.isKycApproved(creatorId);
      if (!kycOk) {
        const err: any = new Error('Vérification d\'identité (KYC) requise pour créer une campagne. Complétez votre vérification dans Paramètres.');
        err.statusCode = 403;
        throw err;
      }
    }

    const cover = data.coverImage ?? data.cover_image;
    const rewardsPayload = data.rewards
      ? (Array.isArray(data.rewards) ? data.rewards : undefined)
      : undefined;

    const initialStatus =
      process.env.CROWDFUNDING_DEFAULT_CAMPAIGN_STATUS === 'active' ? 'active' : 'pending';
    const campaign = await prisma.campaign.create({
      data: {
        creator_id: creatorId,
        title: data.title,
        description: data.description,
        goal_amount: data.goalAmount,
        end_date: data.endDate,
        status: initialStatus,
        category: data.category?.trim() || null,
        cover_image: cover?.trim() || null,
        rewards_data: rewardsPayload === undefined ? undefined : (rewardsPayload as object),
      },
    });
    await ledgerService.getOrCreateCampaignEscrowWallet(campaign.id, creatorId, 'XOF');
    logger.info('Campaign created with escrow wallet', { creatorId, campaignId: campaign.id });
    const { rewards_data, ...rest } = campaign;
    return {
      ...rest,
      rewards: this.normalizeRewardsData(rewards_data),
      image_url: campaign.cover_image ?? undefined,
    };
  }

  // Commission plateforme : 5% sur les contributions
  private readonly PLATFORM_COMMISSION_RATE = 0.05;

  async contribute(campaignId: string, contributorId: string, data: {
    amount: number;
    phone: string;
    rewardTier?: string;
  }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status !== 'active') {
      throw new Error('Campaign not found or not active');
    }

    // Calculer les montants
    const platformFee = data.amount * this.PLATFORM_COMMISSION_RATE;
    const creatorAmount = data.amount - platformFee;

    // Créer la contribution en attente
    const contribution = await prisma.contribution.create({
      data: {
        campaign_id: campaignId,
        contributor_id: contributorId,
        amount: data.amount,
        reward_tier: data.rewardTier,
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: contributorId,
        type: 'campaign_contribution',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Contribution crowdfunding - Campagne "${campaign.title}"`,
        reference_id: contribution.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        contributorId,
        contribution.id,
        {
          amount: data.amount,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/crowdfunding/${campaignId}?contribution=success`,
        }
      );

      logger.info('Contribution crowdfunding créée et paiement Orange Money initié', {
        contributionId: contribution.id,
        campaignId,
        contributorId,
        amount: data.amount,
      });

      return {
        ...contribution,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      // En cas d'erreur, supprimer la contribution
      await prisma.contribution.delete({
        where: { id: contribution.id },
      });

      await prisma.transaction.delete({
        where: { id: transaction.id },
      });

      throw error;
    }
  }

  /**
   * Confirmer une contribution après paiement — argent versé en ESCROW (wallet campagne).
   */
  async confirmContribution(contributionId: string) {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        campaign: true,
      },
    });

    if (!contribution) throw new Error('Contribution non trouvée');
    if ((contribution as any).status === 'completed') return contribution;

    await prisma.transaction.updateMany({
      where: { reference_id: contributionId, type: 'campaign_contribution' },
      data: { status: 'completed' },
    });

    const escrowWallet = await ledgerService.getOrCreateCampaignEscrowWallet(
      contribution.campaign_id,
      contribution.campaign.creator_id,
      'XOF'
    );
    await ledgerService.credit(escrowWallet.id, contribution.amount, {
      referenceId: contributionId,
      referenceType: 'campaign',
      description: `Contribution - Campagne "${contribution.campaign.title}"`,
    });

    await prisma.contribution.update({
      where: { id: contributionId },
      data: { status: 'completed' },
    });

    await prisma.campaign.update({
      where: { id: contribution.campaign_id },
      data: {
        current_amount: { increment: contribution.amount },
        backers_count: { increment: 1 },
      },
    });

    logger.info('Contribution crowdfunding en escrow', {
      contributionId,
      campaignId: contribution.campaign_id,
      amount: contribution.amount,
    });
    return prisma.contribution.findUnique({ where: { id: contributionId }, include: { campaign: true } }) as any;
  }

  /**
   * Libérer l'escrow vers le créateur quand la campagne atteint l'objectif.
   * @param actorUserId  Créateur (ou laisser vide seulement pour appels internes de confiance).
   */
  async releaseEscrowToCreator(campaignId: string, actorUserId: string, actorRole?: string | null) {
    await this.ensureCanManageCampaign(campaignId, actorUserId, actorRole);
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { contributions: { where: { status: 'completed' } } },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.status !== 'active') throw new Error('Campagne déjà traitée');
    if (campaign.current_amount < campaign.goal_amount) throw new Error('Objectif non atteint');

    const escrowWallet = await prisma.wallet.findFirst({
      where: { campaign_id: campaignId },
    });
    if (!escrowWallet || escrowWallet.available_balance < campaign.current_amount) {
      throw new Error('Escrow insuffisant');
    }

    const totalFee = campaign.current_amount * this.PLATFORM_COMMISSION_RATE;
    const creatorAmount = campaign.current_amount - totalFee;

    await ledgerService.debit(escrowWallet.id, campaign.current_amount, {
      referenceId: campaignId,
      referenceType: 'escrow_release',
      description: `Release campagne "${campaign.title}"`,
    });

    const sellerWallet = await withdrawalService.getSellerWallet(campaign.creator_id);
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: { balance: { increment: creatorAmount } },
    });
    await platformRevenueService.addRevenue(
      totalFee,
      'crowdfunding',
      `Commission - Campagne "${campaign.title}"`,
      campaignId
    );
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'funded' },
    });
    logger.info('Escrow crowdfunding libéré', { campaignId, creatorAmount, totalFee });
    return { campaignId, creatorAmount, platformFee: totalFee };
  }

  /**
   * Remboursement automatique si la campagne échoue (date dépassée, objectif non atteint).
   * Si `auth` est fourni, vérifie que l’appelant est le créateur ou un admin.
   */
  async refundCampaignIfFailed(
    campaignId: string,
    auth?: { userId: string; role?: string | null },
  ) {
    if (auth) {
      await this.ensureCanManageCampaign(campaignId, auth.userId, auth.role);
    }
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { contributions: { where: { status: 'completed' } } },
    });
    if (!campaign || campaign.status !== 'active') return { refunded: false };
    if (new Date() < campaign.end_date) return { refunded: false };
    if (campaign.current_amount >= campaign.goal_amount) return { refunded: false };

    const escrowWallet = await prisma.wallet.findFirst({
      where: { campaign_id: campaignId },
    });
    if (!escrowWallet) return { refunded: false };

    for (const c of campaign.contributions) {
      await ledgerService.debit(escrowWallet.id, c.amount, {
        referenceId: c.id,
        referenceType: 'refund',
        description: `Remboursement campagne "${campaign.title}"`,
      });
      const userWallet = await ledgerService.getOrCreateUserWallet(c.contributor_id, 'XOF');
      await ledgerService.credit(userWallet.id, c.amount, {
        referenceId: c.id,
        referenceType: 'refund',
        description: `Remboursement contribution - "${campaign.title}"`,
      });
      await prisma.contribution.update({
        where: { id: c.id },
        data: { status: 'refunded', escrow_released_at: new Date() },
      });
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'failed' },
    });
    logger.info('Campagne remboursée (échec)', { campaignId, count: campaign.contributions.length });
    return { refunded: true, count: campaign.contributions.length };
  }

  /** Libération partielle escrow selon un milestone (créateur ou admin) */
  async releaseMilestone(
    campaignId: string,
    milestoneIndex: number,
    actorUserId: string,
    actorRole?: string | null,
  ) {
    await this.ensureCanManageCampaign(campaignId, actorUserId, actorRole);
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.status !== 'active' && campaign.status !== 'funded') throw new Error('Campagne non éligible');
    const milestones = (campaign.milestones as Array<{ id: string; label: string; amount_target: number; amount_released: number; status: string; released_at?: string }>) ?? [];
    const m = milestones[milestoneIndex];
    if (!m || m.status === 'released') throw new Error('Milestone invalide ou déjà libéré');
    const amountToRelease = m.amount_target - (m.amount_released || 0);
    if (amountToRelease <= 0) throw new Error('Rien à libérer pour ce milestone');

    const escrowWallet = await prisma.wallet.findFirst({
      where: { campaign_id: campaignId },
    });
    if (!escrowWallet || escrowWallet.available_balance < amountToRelease) {
      throw new Error('Solde escrow insuffisant');
    }

    const fee = amountToRelease * this.PLATFORM_COMMISSION_RATE;
    const creatorAmount = amountToRelease - fee;

    await ledgerService.debit(escrowWallet.id, amountToRelease, {
      referenceId: campaignId,
      referenceType: 'contribution',
      description: `Milestone "${m.label}" - Campagne "${campaign.title}"`,
    });
    const sellerWallet = await withdrawalService.getSellerWallet(campaign.creator_id);
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: { balance: { increment: creatorAmount } },
    });
    await platformRevenueService.addRevenue(fee, 'crowdfunding_milestone', `Commission - "${m.label}" - "${campaign.title}"`, campaignId);

    const updated = [...milestones];
    updated[milestoneIndex] = {
      ...m,
      amount_released: (m.amount_released || 0) + amountToRelease,
      status: 'released',
      released_at: new Date().toISOString(),
    };
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { milestones: updated, updated_at: new Date() },
    });
    logger.info('Milestone libéré', { campaignId, milestoneIndex, creatorAmount });
    return { campaignId, milestoneIndex, creatorAmount, platformFee: fee };
  }

  /** Signaler une campagne (incrémente report_count) */
  async reportCampaign(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campagne non trouvée');
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { report_count: { increment: 1 }, updated_at: new Date() },
    });
    return { reported: true, report_count: campaign.report_count + 1 };
  }

  /** Suspendre / marquer fraude (admin) */
  async suspendCampaign(campaignId: string, reason: string, fraudFlag: boolean = false) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campagne non trouvée');
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'suspended', fraud_flag: fraudFlag, updated_at: new Date() },
    });
    logger.warn('Campagne suspendue', { campaignId, reason, fraud_flag: fraudFlag });
    return { suspended: true };
  }

  /** Validation modération : brouillon soumis → collecte visible. */
  async approveCampaignAdmin(campaignId: string) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!c) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (c.status !== 'pending') {
      const err: any = new Error('Seules les campagnes en attente peuvent être approuvées.');
      err.statusCode = 400;
      throw err;
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'active', updated_at: new Date() },
    });
    logger.info('Campagne crowdfunding approuvée', { campaignId });
    return { approved: true };
  }

  async rejectCampaignAdmin(campaignId: string) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!c) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (c.status !== 'pending') {
      const err: any = new Error('Seules les campagnes en attente peuvent être refusées.');
      err.statusCode = 400;
      throw err;
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'rejected', updated_at: new Date() },
    });
    logger.info('Campagne crowdfunding refusée', { campaignId });
    return { rejected: true };
  }

  async listCampaignUpdates(campaignId: string, viewer?: { userId: string; role?: string | null }) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, status: true, creator_id: true } });
    if (!c || !this.canViewCampaignDetail(c, viewer)) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    const rows = await prisma.crowdfundingUpdate.findMany({
      where: { campaign_id: campaignId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return { updates: rows };
  }

  async postCampaignUpdate(
    campaignId: string,
    authorId: string,
    authorRole: string | null | undefined,
    data: { title: string; content: string; imageUrl?: string },
  ) {
    await this.ensureCanManageCampaign(campaignId, authorId, authorRole);
    const title = String(data.title ?? '').trim().slice(0, 200);
    const content = String(data.content ?? '').trim().slice(0, 20000);
    if (!title || !content) {
      const err: any = new Error('Titre et contenu requis.');
      err.statusCode = 400;
      throw err;
    }
    const row = await prisma.crowdfundingUpdate.create({
      data: {
        campaign_id: campaignId,
        title,
        content,
        image_url: typeof data.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl.trim().slice(0, 2000) : null,
      },
    });
    return { update: row };
  }

  async listCampaignComments(
    campaignId: string,
    page: number,
    limit: number,
    viewer?: { userId: string; role?: string | null },
  ) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, status: true, creator_id: true } });
    if (!c || !this.canViewCampaignDetail(c, viewer)) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = { campaign_id: campaignId, parent_id: null as string | null };
    const [rows, total] = await Promise.all([
      prisma.crowdfundingComment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, full_name: true, username: true, profile_image: true } },
        },
      }),
      prisma.crowdfundingComment.count({ where }),
    ]);
    return {
      comments: rows.map((r) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        user: {
          id: r.user_id,
          display_name: r.user?.full_name?.trim() || r.user?.username?.trim() || 'Utilisateur',
          avatar: r.user?.profile_image ?? null,
        },
      })),
      pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) || 0 },
    };
  }

  async postCampaignComment(
    campaignId: string,
    userId: string,
    data: { content: string; parentId?: string | null },
  ) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!c) {
      const err: any = new Error('Campagne introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (c.status !== 'active') {
      const err: any = new Error('Les commentaires ne sont ouverts que pour les campagnes publiées.');
      err.statusCode = 400;
      throw err;
    }
    const content = String(data.content ?? '').trim().slice(0, 4000);
    if (!content) {
      const err: any = new Error('Message vide.');
      err.statusCode = 400;
      throw err;
    }
    let parentId: string | null = null;
    if (data.parentId) {
      const parent = await prisma.crowdfundingComment.findFirst({
        where: { id: data.parentId, campaign_id: campaignId },
      });
      if (!parent) {
        const err: any = new Error('Commentaire parent introuvable.');
        err.statusCode = 400;
        throw err;
      }
      parentId = parent.id;
    }
    const row = await prisma.crowdfundingComment.create({
      data: {
        campaign_id: campaignId,
        user_id: userId,
        content,
        parent_id: parentId,
      },
    });
    return { comment: { id: row.id, created_at: row.created_at } };
  }

  /** Synthèse investisseur (portefeuille). */
  async getInvestorPortfolio(contributorId: string) {
    const base = await this.listMyContributions(contributorId);
    const contributions = base.contributions;
    let totalInvested = 0;
    const byCategory: Record<string, number> = {};
    const byCampaignStatus: Record<string, number> = {};
    for (const row of contributions) {
      if (row.status !== 'completed') continue;
      totalInvested += row.amount;
      const cat = row.campaign?.category || 'autre';
      byCategory[cat] = (byCategory[cat] || 0) + row.amount;
      const st = row.campaign?.status || 'unknown';
      byCampaignStatus[st] = (byCampaignStatus[st] || 0) + row.amount;
    }
    const activeCampaigns = contributions.filter((x) => x.campaign?.status === 'active').length;
    const fundedCampaigns = contributions.filter((x) => x.campaign?.status === 'funded').length;
    return {
      contributions,
      totalInvested,
      byCategory,
      byCampaignStatus,
      counts: {
        rows: contributions.length,
        activeCampaigns,
        fundedCampaigns,
      },
    };
  }

  /**
   * Job interne (cron) : rembourse les campagnes actives expirées sans objectif atteint.
   * Sans `auth` dans `refundCampaignIfFailed` — réservé au worker serveur.
   */
  async processDueFailedCampaignRefunds(options?: { batchSize?: number }): Promise<{
    candidates: number;
    refunded: number;
    notRefunded: number;
  }> {
    const batchSize = Math.min(100, Math.max(1, options?.batchSize ?? 50));
    const now = new Date();
    const rows = await prisma.campaign.findMany({
      where: {
        status: 'active',
        end_date: { lt: now },
      },
      select: { id: true, current_amount: true, goal_amount: true },
      take: batchSize * 2,
    });
    const eligible = rows.filter((r) => r.current_amount < r.goal_amount).slice(0, batchSize);
    let refunded = 0;
    let notRefunded = 0;
    for (const row of eligible) {
      const r = await this.refundCampaignIfFailed(row.id);
      if (r.refunded) refunded += 1;
      else notRefunded += 1;
    }
    return { candidates: eligible.length, refunded, notRefunded };
  }
}

export default new CrowdfundingService();

