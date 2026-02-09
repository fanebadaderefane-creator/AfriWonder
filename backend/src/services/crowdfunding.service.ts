import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import ledgerService from './ledger.service.js';
import verificationService from './verification.service.js';

class CrowdfundingService {
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

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contributions: {
          take: 20,
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!campaign) return null;
    const creator = await prisma.user.findUnique({
      where: { id: campaign.creator_id },
      select: { full_name: true, profile_image: true, email: true },
    });
    return {
      ...campaign,
      creator_name: creator?.full_name ?? creator?.email?.split('@')[0] ?? 'Créateur',
      creator_avatar: creator?.profile_image ?? undefined,
    };
  }

  async create(creatorId: string, data: {
    title: string;
    description: string;
    goalAmount: number;
    endDate: Date;
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

    const campaign = await prisma.campaign.create({
      data: {
        creator_id: creatorId,
        title: data.title,
        description: data.description,
        goal_amount: data.goalAmount,
        end_date: data.endDate,
        status: 'active',
      },
    });
    await ledgerService.getOrCreateCampaignEscrowWallet(campaign.id, creatorId, 'XOF');
    logger.info('Campaign created with escrow wallet', { creatorId, campaignId: campaign.id });
    return campaign;
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
   */
  async releaseEscrowToCreator(campaignId: string) {
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
   */
  async refundCampaignIfFailed(campaignId: string) {
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
  async releaseMilestone(campaignId: string, milestoneIndex: number) {
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
}

export default new CrowdfundingService();

