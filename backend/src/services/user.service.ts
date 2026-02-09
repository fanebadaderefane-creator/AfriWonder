import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { validateUrl } from '../utils/urlValidator.js';
import GamificationEngine from './gamification.service.js';

class UserService {
  async list(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          full_name: true,
          profile_image: true,
          role: true,
          is_verified: true,
          created_at: true,
          _count: {
            select: {
              videos: true,
              following: true,
              follows: true,
              products: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(userId: string, requesterId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        profile_image: true,
        role: true,
        is_verified: true,
        created_at: true,
        seller_profile: {
          select: {
            id: true,
            store_name: true,
            store_description: true,
            country: true,
            city: true,
            rating: true,
            total_sales: true,
            is_verified: true,
            status: true,
          },
        },
        _count: {
          select: {
            videos: true,
            following: true,
            follows: true,
            products: true,
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('Utilisateur non trouvé');
      error.statusCode = 404;
      throw error;
    }

    // Vérifier si l'utilisateur suit ce profil
    let isFollowing = false;
    if (requesterId && requesterId !== userId) {
      const follow = await prisma.follow.findFirst({
        where: {
          follower_id: requesterId,
          following_id: userId,
        },
      });
      isFollowing = !!follow;
    }

    return {
      ...user,
      isFollowing,
    };
  }

  async updateProfile(userId: string, data: {
    full_name?: string;
    profile_image?: string;
    country?: string | null;
  }) {
    // ⚠️ REJETER les URLs Base44 pour les images de profil
    validateUrl(data.profile_image, 'profile_image');

    const payload: { full_name?: string; profile_image?: string; country?: string | null } = {};
    if (data.full_name !== undefined) payload.full_name = data.full_name;
    if (data.profile_image !== undefined) payload.profile_image = data.profile_image;
    if (data.country !== undefined) payload.country = data.country === '' ? null : data.country;

    const user = await prisma.user.update({
      where: { id: userId },
      data: payload,
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        profile_image: true,
        country: true,
        role: true,
        is_verified: true,
        updated_at: true,
      },
    });

    logger.info('Profil utilisateur mis à jour', { userId });
    return user;
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { following_id: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.follow.count({ where: { following_id: userId } }),
    ]);

    return {
      followers: follows.map(f => f.follower),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { follower_id: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.follow.count({ where: { follower_id: userId } }),
    ]);

    return {
      following: follows.map(f => f.following),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      const error: any = new Error('Vous ne pouvez pas vous suivre vous-même');
      error.statusCode = 400;
      throw error;
    }

    const existingFollow = await prisma.follow.findFirst({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return { following: false };
    } else {
      await prisma.follow.create({
        data: {
          follower_id: followerId,
          following_id: followingId,
        },
      });
      const followersCount = await prisma.follow.count({
        where: { following_id: followingId },
      });
      if (followersCount >= 100) {
        GamificationEngine.on100Followers(followingId).catch((e) =>
          logger.warn('Gamification on100Followers', { followingId, err: e })
        );
      }
      return { following: true };
    }
  }

  async getUserStats(userId: string) {
    const [user, videosCount, followersCount, followingCount, productsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          full_name: true,
          profile_image: true,
          role: true,
          is_verified: true,
        },
      }),
      prisma.video.count({ where: { creator_id: userId } }),
      prisma.follow.count({ where: { following_id: userId } }),
      prisma.follow.count({ where: { follower_id: userId } }),
      prisma.product.count({ where: { seller_id: userId } }),
    ]);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return {
      user,
      stats: {
        videos: videosCount,
        followers: followersCount,
        following: followingCount,
        products: productsCount,
      },
    };
  }

  async getLikedVideos(userId: string, page: number = 1, limit?: number) {
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const shouldGetAll = !limit || limit === 0;
    const actualLimit = shouldGetAll ? undefined : limit;
    const skip = shouldGetAll ? undefined : (page - 1) * (limit || 0);

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { user_id: userId },
        include: {
          video: {
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                  full_name: true,
                  profile_image: true,
                },
              },
              _count: {
                select: {
                  video_likes: true,
                  video_comments: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        ...(skip !== undefined && { skip }),
        ...(actualLimit !== undefined && { take: actualLimit }),
      }),
      prisma.like.count({ where: { user_id: userId } }),
    ]);

    return {
      videos: likes.map(like => like.video).filter(Boolean),
      pagination: {
        page: shouldGetAll ? 1 : page,
        limit: shouldGetAll ? total : (actualLimit || total),
        total,
        totalPages: shouldGetAll ? 1 : Math.ceil(total / (actualLimit || total)),
      },
    };
  }
}

export const userService = new UserService();
export default userService;

