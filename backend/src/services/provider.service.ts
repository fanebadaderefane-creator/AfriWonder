/**
 * Service de gestion des prestataires (Services Locaux)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class ProviderService {
  async createProvider(userId: string, data: {
    service_categories: string[];
    service_radius_km?: number;
    location_type?: string;
    payout_method?: string;
    payout_account?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    bio?: string;
  }) {
    const existing = await prisma.serviceProvider.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      throw new Error('Vous êtes déjà prestataire');
    }

    const provider = await prisma.serviceProvider.create({
      data: {
        user_id: userId,
        service_categories: data.service_categories || [],
        service_radius_km: data.service_radius_km ?? 10,
        location_type: data.location_type || 'both',
        payout_method: data.payout_method,
        payout_account: data.payout_account,
        phone: data.phone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        country: data.country?.trim() || null,
        bio: data.bio?.trim() || null,
        status: 'pending',
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
      },
    });

    logger.info('Prestataire créé', { providerId: provider.id, userId });
    return provider;
  }

  async updateProvider(providerId: string, data: {
    service_categories?: string[];
    service_radius_km?: number;
    location_type?: string;
    payout_method?: string;
    payout_account?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    bio?: string;
  }) {
    const provider = await prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        ...(data.service_categories && { service_categories: data.service_categories }),
        ...(data.service_radius_km != null && { service_radius_km: data.service_radius_km }),
        ...(data.location_type && { location_type: data.location_type }),
        ...(data.payout_method !== undefined && { payout_method: data.payout_method }),
        ...(data.payout_account !== undefined && { payout_account: data.payout_account }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.country !== undefined && { country: data.country?.trim() || null }),
        ...(data.bio !== undefined && { bio: data.bio?.trim() || null }),
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
      },
    });
    return provider;
  }

  async getProvider(providerId: string) {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
        services: {
          where: { is_available: true },
          take: 50,
        },
      },
    });
    if (!provider) throw new Error('Prestataire non trouvé');
    return provider;
  }

  async getProviderByUserId(userId: string) {
    const provider = await prisma.serviceProvider.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });
    return provider;
  }

  async listProviders(params?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { status: 'active' };
    if (params?.category) {
      where.service_categories = { has: params.category };
    }
    if (params?.status) {
      where.status = params.status;
    }

    const [providers, total] = await Promise.all([
      prisma.serviceProvider.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
          services: {
            where: { is_available: true },
            take: 5,
          },
        },
        orderBy: { average_rating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.serviceProvider.count({ where }),
    ]);

    return {
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(providerId: string, status: string) {
    return prisma.serviceProvider.update({
      where: { id: providerId },
      data: { status },
    });
  }

  async updateStats(providerId: string) {
    const [bookingsCount, reviewsAgg] = await Promise.all([
      prisma.serviceBooking.count({
        where: {
          provider_id: providerId,
          status: 'completed',
        },
      }),
      prisma.serviceReview.aggregate({
        where: {
          booking: { provider_id: providerId },
        },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const totalEarnings = await prisma.serviceBooking.aggregate({
      where: {
        provider_id: providerId,
        status: 'completed',
        payment_status: 'paid',
      },
      _sum: { provider_earnings: true },
    });

    await prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        total_bookings: bookingsCount,
        average_rating: reviewsAgg._avg.rating ?? 0,
        total_earnings: totalEarnings._sum.provider_earnings ?? 0,
      },
    });
  }

  async verifyProvider(providerId: string) {
    return prisma.serviceProvider.update({
      where: { id: providerId },
      data: { is_verified: true, verification_badge: 'verified', status: 'active' },
    });
  }
}

export const providerService = new ProviderService();
export default providerService;
