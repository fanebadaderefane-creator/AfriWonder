/**
 * CDC Phase 1 - Service publicitaire
 * Campagnes, créatifs, impressions, clics, tarification FCFA
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import platformRevenueService from './platformRevenue.service.js';

// Tarification par durée (FCFA) - CDC Phase 1
export const AD_PRICING_BY_DURATION: Record<number, number> = {
  1: 2000,
  3: 5000,
  7: 10000,
  14: 18000,
  30: 35000,
  60: 60000,
  90: 85000,
};

const VALID_DURATION_DAYS = [1, 3, 7, 14, 30, 60, 90];

export interface CreateCampaignInput {
  advertiser_id: string;
  name: string;
  ad_type?: string;
  duration_days: number;
  target_countries?: string[];
  target_cities?: string[];
  target_age_min?: number;
  target_age_max?: number;
  target_gender?: string;
  target_interests?: string[];
}

export interface CreateCreativeInput {
  campaign_id: string;
  media_type: 'video' | 'image';
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  cta_type?: 'buy' | 'visit' | 'install' | 'whatsapp' | 'contact';
  cta_url?: string;
  cta_label?: string;
}

export interface FeedViewerContext {
  userId?: string;
  deviceId?: string;
  country?: string;
  city?: string;
  age?: number;
  gender?: string;
}

class AdsService {
  getPriceForDuration(days: number): number {
    return AD_PRICING_BY_DURATION[days] ?? 0;
  }

  async createCampaign(input: CreateCampaignInput) {
    if (!VALID_DURATION_DAYS.includes(input.duration_days)) {
      throw new Error(`Durée invalide. Valeurs acceptées: ${VALID_DURATION_DAYS.join(', ')}`);
    }
    const price = this.getPriceForDuration(input.duration_days);
    if (!price) throw new Error('Tarification non disponible pour cette durée');

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + input.duration_days);

    const campaign = await prisma.adCampaign.create({
      data: {
        advertiser_id: input.advertiser_id,
        name: input.name,
        ad_type: input.ad_type || 'in_feed',
        duration_days: input.duration_days,
        price_fcfa: price,
        starts_at: now,
        ends_at: endsAt,
        status: 'draft',
        target_countries: input.target_countries || [],
        target_cities: input.target_cities || [],
        target_age_min: input.target_age_min,
        target_age_max: input.target_age_max,
        target_gender: input.target_gender,
        target_interests: input.target_interests || [],
      },
    });
    return campaign;
  }

  async updateCampaign(campaignId: string, advertiserId: string, data: { name?: string; duration_days?: number }) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.advertiser_id !== advertiserId) throw new Error('Non autorisé');
    if (campaign.status !== 'draft') {
      throw new Error('Seules les campagnes en brouillon peuvent être modifiées');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.duration_days !== undefined) {
      if (!VALID_DURATION_DAYS.includes(data.duration_days)) {
        throw new Error(`Durée invalide. Valeurs acceptées: ${VALID_DURATION_DAYS.join(', ')}`);
      }
      const price = this.getPriceForDuration(data.duration_days);
      if (!price) throw new Error('Tarification non disponible pour cette durée');
      updateData.duration_days = data.duration_days;
      updateData.price_fcfa = price;
      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setDate(endsAt.getDate() + data.duration_days);
      updateData.ends_at = endsAt;
    }

    if (Object.keys(updateData).length === 0) return campaign;

    return prisma.adCampaign.update({
      where: { id: campaignId },
      data: updateData as any,
    });
  }

  async deleteCampaign(campaignId: string, advertiserId: string) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.advertiser_id !== advertiserId) throw new Error('Non autorisé');
    if (campaign.status !== 'draft') {
      throw new Error('Seules les campagnes en brouillon peuvent être supprimées');
    }

    await prisma.adCampaign.delete({
      where: { id: campaignId },
    });
    return { success: true };
  }

  async addCreative(input: CreateCreativeInput) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: input.campaign_id },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.status !== 'draft' && campaign.status !== 'pending_review') {
      throw new Error('Impossible d\'ajouter un créatif à une campagne déjà active');
    }

    return prisma.adCreative.create({
      data: {
        campaign_id: input.campaign_id,
        media_type: input.media_type,
        media_url: input.media_url,
        thumbnail_url: input.thumbnail_url,
        title: input.title,
        description: input.description,
        cta_type: input.cta_type || 'visit',
        cta_url: input.cta_url,
        cta_label: input.cta_label || 'Découvrir',
      },
    });
  }

  async submitForReview(campaignId: string, advertiserId: string) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: { creatives: true },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.advertiser_id !== advertiserId) throw new Error('Non autorisé');
    if (campaign.status !== 'draft') throw new Error('Campagne déjà soumise');
    if (campaign.creatives.length === 0) throw new Error('Ajoutez au moins un créatif');

    const priceFcfa = campaign.price_fcfa ?? 0;
    if (priceFcfa <= 0) throw new Error('Tarification invalide');

    const ledgerService = (await import('./ledger.service.js')).default;
    const platformRevenueService = (await import('./platformRevenue.service.js')).default;

    const advertiserWallet = await ledgerService.getOrCreateUserWallet(advertiserId, 'XOF');
    const available = (advertiserWallet as any).available_balance ?? advertiserWallet.balance ?? 0;
    if (available < priceFcfa) {
      const err: any = new Error(`Solde insuffisant. Votre solde: ${Math.round(available).toLocaleString()} FCFA. Rechargez votre portefeuille.`);
      err.statusCode = 400;
      throw err;
    }

    await ledgerService.debit(advertiserWallet.id, priceFcfa, {
      referenceId: campaignId,
      referenceType: 'campaign',
      description: `Campagne pub: ${campaign.name}`,
    });

    await platformRevenueService.addRevenue(
      priceFcfa,
      'ads',
      `Campagne pub: ${campaign.name} (${priceFcfa} FCFA)`,
      campaignId
    );

    return prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: 'pending_review' },
    });
  }

  async approveCampaign(campaignId: string, adminId: string) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: { creatives: true },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.status !== 'pending_review') throw new Error('Campagne non en attente de validation');

    await prisma.$transaction([
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'active' },
      }),
      ...campaign.creatives.map((c) =>
        prisma.adCreative.update({
          where: { id: c.id },
          data: { is_approved: true, approved_at: new Date(), approved_by: adminId },
        })
      ),
    ]);

    try {
      await platformRevenueService.addRevenue(
        campaign.price_fcfa ?? 0,
        'ads',
        `Campagne pub "${campaign.name}" (${campaign.price_fcfa ?? 0} FCFA)`,
        campaignId
      );
    } catch (err) {
      logger.warn('ads.approveCampaign: addRevenue failed (campaign approved)', { err: (err as Error)?.message, campaignId });
    }

    return prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: { creatives: true },
    });
  }

  async rejectCampaign(campaignId: string, adminId: string, reason?: string) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: { creatives: true },
    });
    if (!campaign) throw new Error('Campagne non trouvée');
    if (campaign.status !== 'pending_review') throw new Error('Campagne non en attente de validation');

    await prisma.$transaction([
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'draft' },
      }),
      ...campaign.creatives.map((c) =>
        prisma.adCreative.update({
          where: { id: c.id },
          data: { rejection_reason: reason },
        })
      ),
    ]);

    return prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: { creatives: true },
    });
  }

  async getTopBannerAds(limit = 3, context?: FeedViewerContext): Promise<any[]> {
    const now = new Date();
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: 'active',
        ad_type: 'top_banner',
        ends_at: { gt: now },
        creatives: {
          some: { is_approved: true },
        },
      },
      include: {
        creatives: {
          where: { is_approved: true },
          take: 1,
          orderBy: { created_at: 'asc' },
        },
        advertiser: {
          select: { id: true, username: true, full_name: true, profile_image: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    let filtered = campaigns;
    if (context?.country && context.country.length >= 2) {
      filtered = filtered.filter(
        (c) =>
          c.target_countries.length === 0 ||
          c.target_countries.some((tc: string) => tc.toUpperCase() === context.country!.toUpperCase())
      );
    }
    if (context?.age != null) {
      filtered = filtered.filter((c) => {
        const min = c.target_age_min ?? 0;
        const max = c.target_age_max ?? 120;
        return context.age! >= min && context.age! <= max;
      });
    }
    if (context?.gender && context.gender !== 'all') {
      filtered = filtered.filter(
        (c) => !c.target_gender || c.target_gender === 'all' || c.target_gender === context.gender
      );
    }

    return filtered.slice(0, limit).map((c) => ({
      id: c.id,
      campaign_id: c.id,
      creative: c.creatives[0],
      advertiser: c.advertiser,
      ad_type: 'top_banner',
    }));
  }

  async getActiveAdsForFeed(limit: number, context?: FeedViewerContext): Promise<any[]> {
    const now = new Date();
    // in_feed, boost_post, sponsored_video, business_campaign → tous affichés dans le feed Accueil
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: 'active',
        ad_type: { in: ['in_feed', 'boost_post', 'sponsored_video', 'business_campaign'] },
        ends_at: { gt: now },
        creatives: {
          some: { is_approved: true },
        },
      },
      include: {
        creatives: {
          where: { is_approved: true },
          take: 1,
          orderBy: { created_at: 'asc' },
        },
        advertiser: {
          select: { id: true, username: true, full_name: true, profile_image: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit * 2, // Buffer pour ciblage
    });

    // Filtrage ciblage basique (pays, âge, sexe)
    let filtered = campaigns;
    if (context?.country && context.country.length === 2) {
      filtered = filtered.filter(
        (c) =>
          c.target_countries.length === 0 ||
          c.target_countries.some((tc: string) => tc.toUpperCase() === context.country!.toUpperCase())
      );
    }
    if (context?.age != null) {
      filtered = filtered.filter((c) => {
        const min = c.target_age_min ?? 0;
        const max = c.target_age_max ?? 120;
        return context.age! >= min && context.age! <= max;
      });
    }
    if (context?.gender && context.gender !== 'all') {
      filtered = filtered.filter(
        (c) => !c.target_gender || c.target_gender === 'all' || c.target_gender === context.gender
      );
    }

    return filtered.slice(0, limit).map((c) => ({
      id: c.id,
      campaign_id: c.id,
      creative: c.creatives[0],
      advertiser: c.advertiser,
      ad_type: c.ad_type,
    }));
  }

  async recordImpression(creativeId: string, campaignId: string, viewerKey: string) {
    const [creative, campaign] = await Promise.all([
      prisma.adCreative.findUnique({ where: { id: creativeId } }),
      prisma.adCampaign.findUnique({ where: { id: campaignId } }),
    ]);
    if (!creative || !campaign) {
      const e: any = new Error('Créatif ou campagne non trouvé');
      e.statusCode = 404;
      throw e;
    }
    if (!creative.is_approved || campaign.status !== 'active') return null;

    await prisma.$transaction([
      prisma.adImpression.create({
        data: { creative_id: creativeId, campaign_id: campaignId, viewer_key: viewerKey },
      }),
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: { total_views: { increment: 1 } },
      }),
    ]);

    return { ok: true };
  }

  async recordClick(creativeId: string, campaignId: string, viewerKey: string) {
    const [creative, campaign] = await Promise.all([
      prisma.adCreative.findUnique({ where: { id: creativeId } }),
      prisma.adCampaign.findUnique({ where: { id: campaignId } }),
    ]);
    if (!creative || !campaign) {
      const e: any = new Error('Créatif ou campagne non trouvé');
      e.statusCode = 404;
      throw e;
    }

    await prisma.$transaction([
      prisma.adClick.create({
        data: { creative_id: creativeId, campaign_id: campaignId, viewer_key: viewerKey },
      }),
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: { total_clicks: { increment: 1 } },
      }),
    ]);

    return { ok: true };
  }

  async getAdvertiserCampaigns(advertiserId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where: { advertiser_id: advertiserId },
        include: {
          creatives: true,
          _count: { select: { impressions: true, clicks: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adCampaign.count({ where: { advertiser_id: advertiserId } }),
    ]);

    return {
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCampaignStats(campaignId: string, advertiserId: string) {
    const campaign = await prisma.adCampaign.findFirst({
      where: { id: campaignId, advertiser_id: advertiserId },
      include: {
        creatives: true,
        _count: { select: { impressions: true, clicks: true } },
      },
    });
    if (!campaign) throw new Error('Campagne non trouvée');

    const conversionRate =
      campaign.total_views > 0 ? (campaign.total_clicks / campaign.total_views) * 100 : 0;

    return {
      ...campaign,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      days_remaining: Math.max(
        0,
        Math.ceil((campaign.ends_at.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    };
  }

  async getCampaignsPendingReview(adminId: string) {
    return prisma.adCampaign.findMany({
      where: { status: 'pending_review' },
      include: {
        creatives: true,
        advertiser: {
          select: { id: true, username: true, full_name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Toutes les campagnes publicitaires (admin) - avec filtre optionnel par statut */
  async getAllCampaignsForAdmin(status?: string) {
    const where = status ? { status } : {};
    return prisma.adCampaign.findMany({
      where,
      include: {
        creatives: true,
        advertiser: {
          select: { id: true, username: true, full_name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async expireCampaigns() {
    const result = await prisma.adCampaign.updateMany({
      where: {
        status: 'active',
        ends_at: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    if (result.count > 0) {
      logger.info({ count: result.count }, 'Campagnes publicitaires expirées');
    }
    return result.count;
  }
}

export const adsService = new AdsService();
export default adsService;
