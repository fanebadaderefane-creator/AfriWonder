import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class PlaylistService {
  async getUserPlaylists(options: {
    targetUserId: string;
    viewerUserId?: string | null;
    page?: number;
    limit?: number;
  }) {
    const targetUserId = String(options.targetUserId || '').trim();
    const viewerUserId = options.viewerUserId ? String(options.viewerUserId).trim() : null;
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    if (!targetUserId) {
      throw new Error('targetUserId requis');
    }
    const skip = (page - 1) * limit;
    const isOwner = Boolean(viewerUserId && viewerUserId === targetUserId);
    const where = isOwner
      ? { user_id: targetUserId }
      : { user_id: targetUserId, is_public: true };

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile_image: true,
            },
          },
          items: {
            take: 5,
            include: {
              video: {
                select: {
                  id: true,
                  title: true,
                  thumbnail_url: true,
                  video_url: true,
                  low_quality_url: true,
                  hls_url: true,
                  duration: true,
                  views: true,
                  likes: true,
                  created_at: true,
                  updated_at: true,
                  creator: {
                    select: {
                      id: true,
                      username: true,
                      full_name: true,
                      profile_image: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.playlist.count({ where }),
    ]);

    return {
      playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlaylist(playlistId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
        items: {
          include: {
            video: {
              include: {
                creator: {
                  select: {
                    id: true,
                    username: true,
                    profile_image: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    return playlist;
  }

  async create(userId: string, data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }) {
    const playlist = await prisma.playlist.create({
      data: {
        user_id: userId,
        name: data.name,
        description: data.description,
        is_public: data.isPublic || false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
      },
    });

    logger.info('Playlist created', { userId, playlistId: playlist.id });
    return playlist;
  }

  async update(
    playlistId: string,
    userId: string,
    data: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
    },
  ) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist not found or unauthorized');
    }

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isPublic !== undefined && { is_public: data.isPublic }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
      },
    });

    logger.info('Playlist updated', { playlistId, userId });
    return updated;
  }

  async addVideo(playlistId: string, userId: string, videoId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist not found or unauthorized');
    }

    const existing = await prisma.playlistItem.findFirst({
      where: {
        playlist_id: playlistId,
        video_id: videoId,
      },
    });

    if (existing) {
      throw new Error('Video already in playlist');
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    // Get max position
    const maxPosition = await prisma.playlistItem.findFirst({
      where: { playlist_id: playlistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const item = await prisma.playlistItem.create({
      data: {
        playlist_id: playlistId,
        video_id: videoId,
        position: (maxPosition?.position || 0) + 1,
      },
      include: {
        video: true,
      },
    });

    // Update videos count
    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        videos_count: { increment: 1 },
      },
    });

    logger.info('Video added to playlist', { playlistId, videoId });
    return item;
  }

  async removeVideo(playlistId: string, userId: string, videoId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist not found or unauthorized');
    }

    const item = await prisma.playlistItem.findFirst({
      where: {
        playlist_id: playlistId,
        video_id: videoId,
      },
    });

    if (!item) {
      throw new Error('Video not in playlist');
    }

    // Use deleteMany since we might have multiple items
    await prisma.playlistItem.deleteMany({
      where: {
        playlist_id: playlistId,
        video_id: videoId,
      },
    });

    // Update videos count
    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        videos_count: { decrement: 1 },
      },
    });

    logger.info('Video removed from playlist', { playlistId, videoId });
    return { success: true };
  }

  async delete(playlistId: string, userId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist not found or unauthorized');
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    logger.info('Playlist deleted', { playlistId, userId });
    return { success: true };
  }
}

export default new PlaylistService();

