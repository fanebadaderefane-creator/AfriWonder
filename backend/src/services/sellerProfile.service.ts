import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class SellerProfileService {
  async getByUserId(userId: string) {
    return prisma.sellerProfile.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });
  }

  async register(userId: string, data: {
    store_name: string;
    store_description?: string;
    country?: string;
    city?: string;
    store_logo?: string;
    store_banner?: string;
  }) {
    const existing = await prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      const err: any = new Error('Vous avez déjà un compte vendeur');
      err.statusCode = 400;
      throw err;
    }
    if (!data.store_name || !data.store_name.trim()) {
      const err: any = new Error('Le nom de la boutique est requis');
      err.statusCode = 400;
      throw err;
    }
    const profile = await prisma.sellerProfile.create({
      data: {
        user_id: userId,
        store_name: data.store_name.trim(),
        store_description: data.store_description?.trim() || null,
        country: data.country?.trim() || null,
        city: data.city?.trim() || null,
        store_logo: data.store_logo || null,
        store_banner: data.store_banner || null,
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
      },
    });
    logger.info('Compte vendeur créé', { userId, profileId: profile.id });
    return profile;
  }

  async update(userId: string, data: Partial<{
    store_name: string;
    store_description: string;
    country: string;
    city: string;
    store_logo: string;
    store_banner: string;
    subscription_tier: string; // CDC: free | starter | business | enterprise
  }>) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      const err: any = new Error('Profil vendeur non trouvé');
      err.statusCode = 404;
      throw err;
    }
    const updated = await prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        ...(data.store_name != null && { store_name: data.store_name.trim() }),
        ...(data.store_description != null && { store_description: data.store_description.trim() || null }),
        ...(data.country != null && { country: data.country.trim() || null }),
        ...(data.city != null && { city: data.city.trim() || null }),
        ...(data.store_logo != null && { store_logo: data.store_logo || null }),
        ...(data.store_banner != null && { store_banner: data.store_banner || null }),
        ...(data.subscription_tier != null && ['free', 'starter', 'business', 'enterprise'].includes(data.subscription_tier) && { subscription_tier: data.subscription_tier }),
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
    logger.info('Profil vendeur mis à jour', { userId });
    return updated;
  }

  async hasSellerProfile(userId: string): Promise<boolean> {
    const p = await prisma.sellerProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    return !!p;
  }
}

export default new SellerProfileService();
