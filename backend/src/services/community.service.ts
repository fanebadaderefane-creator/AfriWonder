import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class CommunityService {
  async list(page: number = 1, limit: number = 20, filters?: {
    category?: string;
    isPrivate?: boolean;
    search?: string;
  }, forUserId?: string | null) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.category) where.category = filters.category;
    if (filters?.isPrivate !== undefined) where.is_private = filters.isPrivate;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              profile_image: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { members_count: 'desc' },
      }),
      prisma.community.count({ where }),
    ]);

    let listed: Array<(typeof communities)[number] & { is_member?: boolean }> = communities;
    if (forUserId && communities.length > 0) {
      const ids = communities.map((c) => c.id);
      const memberships = await prisma.communityMember.findMany({
        where: {
          user_id: forUserId,
          community_id: { in: ids },
        },
        select: { community_id: true },
      });
      const memberIds = new Set(memberships.map((m) => m.community_id));
      listed = communities.map((c) => ({ ...c, is_member: memberIds.has(c.id) }));
    }

    return {
      communities: listed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(creatorId: string, data: {
    name: string;
    description?: string;
    avatar?: string;
    banner?: string;
    category?: string;
    isPrivate?: boolean;
  }) {
    const community = await prisma.community.create({
      data: {
        creator_id: creatorId,
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        banner: data.banner,
        category: data.category,
        is_private: data.isPrivate || false,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
      },
    });

    // Add creator as admin member
    await prisma.communityMember.create({
      data: {
        community_id: community.id,
        user_id: creatorId,
        role: 'admin',
      },
    });

    // Update members count
    await prisma.community.update({
      where: { id: community.id },
      data: { members_count: 1 },
    });

    logger.info('Community created', { creatorId, communityId: community.id });
    return community;
  }

  async getById(communityId: string, forUserId?: string | null) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
        members: {
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile_image: true,
              },
            },
          },
        },
      },
    });

    if (!community) return null;
    if (!forUserId) return community;

    const membership = await prisma.communityMember.findFirst({
      where: { community_id: communityId, user_id: forUserId },
      select: { id: true },
    });

    return { ...community, is_member: Boolean(membership) };
  }

  async join(communityId: string, userId: string) {
    const existing = await prisma.communityMember.findFirst({
      where: {
        community_id: communityId,
        user_id: userId,
      },
    });

    if (existing) {
      throw new Error('Already a member');
    }

    const member = await prisma.communityMember.create({
      data: {
        community_id: communityId,
        user_id: userId,
        role: 'member',
      },
    });

    // Update members count
    await prisma.community.update({
      where: { id: communityId },
      data: {
        members_count: { increment: 1 },
      },
    });

    logger.info('User joined community', { communityId, userId });
    return member;
  }

  async leave(communityId: string, userId: string) {
    const member = await prisma.communityMember.findFirst({
      where: {
        community_id: communityId,
        user_id: userId,
      },
    });

    if (!member) {
      throw new Error('Not a member');
    }

    await prisma.communityMember.delete({
      where: { id: member.id },
    });

    // Update members count
    await prisma.community.update({
      where: { id: communityId },
      data: {
        members_count: { decrement: 1 },
      },
    });

    logger.info('User left community', { communityId, userId });
    return { success: true };
  }
}

export default new CommunityService();

