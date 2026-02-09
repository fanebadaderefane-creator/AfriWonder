import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { validateUrl } from '../utils/urlValidator.js';
import GamificationEngine from './gamification.service.js';

interface ListOptions {
  page: number;
  limit?: number;
  category?: string;
  visibility?: string;
  userId?: string;
  creator_id?: string;
}

class VideoService {
  /**
   * Normalise une URL vidéo/image UNIQUEMENT à l'upload
   * Décodage récursif puis réencodage propre
   * NE JAMAIS utiliser dans list() ou getById() - ça casse la stabilité React
   */
  private normalizeUrl(url: string): string {
    if (!url) return url;
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const filename = parts.pop();

      if (!filename) return url;

      // Décoder récursivement si nécessaire
      let decoded = filename;
      let previous = '';
      let maxIterations = 5;
      
      for (let i = 0; i < maxIterations; i++) {
        previous = decoded;
        try {
          const temp = decodeURIComponent(decoded);
          if (temp === decoded) break;
          decoded = temp;
        } catch {
          break;
        }
      }

      // Réencoder proprement
      const safeFilename = encodeURIComponent(decoded);
      parts.push(safeFilename);
      u.pathname = parts.join('/');

      return u.toString();
    } catch {
      // Si l'URL n'est pas valide, retourner telle quelle
      return url;
    }
  }
  async list(options: ListOptions) {
    const { page, limit, category, visibility = 'public', userId, creator_id: creatorId } = options;
    // Si limit n'est pas spécifié ou est 0, récupérer toutes les vidéos
    const shouldGetAll = !limit || limit === 0;
    const skip = shouldGetAll ? undefined : (page - 1) * (limit || 0);

    const where: any = {
      // Exclure les vidéos avec des URLs de test (example.com)
      video_url: {
        not: {
          contains: 'example.com',
        },
      },
    };

    // Filtre par visibilité
    if (visibility === 'public') {
      where.visibility = 'public';
    } else if (userId) {
      // Si utilisateur connecté, voir aussi ses vidéos privées et celles des abonnements
      where.OR = [
        { visibility: 'public' },
        { visibility: 'prive', creator_id: userId },
        {
          visibility: 'abonnes',
          creator: {
            followers: {
              some: {
                follower_id: userId,
              },
            },
          },
        },
      ];
    }

    // Filtre par catégorie
    if (category) {
      where.category = category;
    }
    // Filtre par créateur
    if (creatorId) {
      where.creator_id = creatorId;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
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
        orderBy: {
          created_at: 'desc',
        },
        ...(skip !== undefined && { skip }),
        ...(!shouldGetAll && limit && { take: limit }),
      }),
      prisma.video.count({ where }),
    ]);

    // Formater les vidéos pour correspondre au format attendu par le frontend
    // IMPORTANT: Ne JAMAIS modifier les URLs ici - elles doivent être stables pour React
    const formattedVideos = videos.map((video: any) => {
      const { creator, _count, ...videoData } = video;
      // Parser les hashtags depuis JSON si nécessaire
      let hashtags = video.hashtags;
      if (typeof hashtags === 'string') {
        try {
          hashtags = JSON.parse(hashtags);
        } catch {
          hashtags = [];
        }
      }
      return {
        ...videoData,
        // URLs lues directement depuis la base - aucune transformation
        creator_id: creator?.id || video.creator_id,
        creator_name: creator?.full_name || creator?.username || '',
        creator_avatar: creator?.profile_image || '',
        views: video.views ?? 0, // S'assurer que views est toujours défini
        likes: _count?.video_likes || video.likes || 0,
        comments_count: _count?.video_comments || video.comments_count || 0,
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        music_title: video.music_title || null,
      };
    });

    return {
      videos: formattedVideos,
      pagination: {
        page: shouldGetAll ? 1 : page,
        limit: shouldGetAll ? total : (limit || total),
        total,
        totalPages: shouldGetAll ? 1 : Math.ceil(total / (limit || total)),
      },
    };
  }

  async getById(id: string, userId?: string) {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
        video_likes: userId
          ? {
              where: { user_id: userId },
              select: { id: true },
            }
          : false,
        _count: {
          select: {
            video_likes: true,
            video_comments: true,
          },
        },
      },
    });

    if (!video) {
      const error: any = new Error('Vidéo non trouvée');
      error.statusCode = 404;
      throw error;
    }

    // Vérifier la visibilité
    if (video.visibility === 'prive' && video.creator_id !== userId) {
      const error: any = new Error('Vidéo privée');
      error.statusCode = 403;
      throw error;
    }

    if (video.visibility === 'abonnes' && video.creator_id !== userId && userId) {
      const isFollowing = await prisma.follow.findFirst({
        where: {
          follower_id: userId,
          following_id: video.creator_id,
        },
      });

      if (!isFollowing) {
        const error: any = new Error('Vous devez suivre le créateur pour voir cette vidéo');
        error.statusCode = 403;
        throw error;
      }
    }

    // Incrémenter les vues
    await prisma.video.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    // Parser les hashtags depuis JSON si nécessaire
    let hashtags = video.hashtags;
    if (typeof hashtags === 'string') {
      try {
        hashtags = JSON.parse(hashtags);
      } catch {
        hashtags = [];
      }
    }

    // Formater la réponse pour correspondre au format attendu par le frontend
    // IMPORTANT: Ne JAMAIS modifier les URLs ici - elles doivent être stables pour React
    const formattedVideo: any = {
      ...video,
      // URLs lues directement depuis la base - aucune transformation
      creator_id: video.creator.id,
      creator_name: video.creator.full_name || video.creator.username,
      creator_avatar: video.creator.profile_image,
      is_verified: false,
      is_liked: video.video_likes ? (Array.isArray(video.video_likes) && video.video_likes.length > 0) : false,
      likes: video._count?.video_likes || 0,
      comments_count: video._count?.video_comments || 0,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      music_title: video.music_title || null,
    };

    // Supprimer les champs internes
    delete formattedVideo.creator;
    if (formattedVideo.video_likes !== undefined) {
      delete formattedVideo.video_likes;
    }
    delete formattedVideo._count;

    return formattedVideo;
  }

  async create(data: {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    creator_id: string;
    visibility?: string;
    category?: string;
    hashtags?: string[];
    music_title?: string;
  }) {
    // Valider les données requises
    if (!data.title || !data.video_url) {
      const error: any = new Error('Titre et URL vidéo sont requis');
      error.statusCode = 400;
      throw error;
    }

    // Rejeter les URLs de domaines externes non autorisés
    validateUrl(data.video_url, 'video_url');
    validateUrl(data.thumbnail_url, 'thumbnail_url');

    // Normaliser les URLs UNIQUEMENT à l'upload (une seule fois)
    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        video_url: this.normalizeUrl(data.video_url),
        thumbnail_url: data.thumbnail_url ? this.normalizeUrl(data.thumbnail_url) : undefined,
        creator_id: data.creator_id,
        visibility: data.visibility || 'public',
        category: data.category,
        hashtags: data.hashtags ? JSON.stringify(data.hashtags) : undefined,
        music_title: data.music_title,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    logger.info('Vidéo créée', { videoId: video.id, creatorId: data.creator_id });

    GamificationEngine.onVideoUpload(data.creator_id).catch((e) =>
      logger.warn('Gamification onVideoUpload', { creatorId: data.creator_id, err: e })
    );

    return video;
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    visibility: string;
    category: string;
  }>, userId: string) {
    // Vérifier que l'utilisateur est le créateur
    const video = await prisma.video.findUnique({
      where: { id },
      select: { creator_id: true },
    });

    if (!video) {
      throw new Error('Vidéo non trouvée');
    }

    if (video.creator_id !== userId) {
      throw new Error('Non autorisé');
    }

    const updated = await prisma.video.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    // Vérifier que l'utilisateur est le créateur
    const video = await prisma.video.findUnique({
      where: { id },
      select: { creator_id: true },
    });

    if (!video) {
      throw new Error('Vidéo non trouvée');
    }

    if (video.creator_id !== userId) {
      throw new Error('Non autorisé');
    }

    await prisma.video.delete({
      where: { id },
    });

    logger.info('Vidéo supprimée', { videoId: id, userId });
  }

  async toggleLike(videoId: string, userId: string) {
    const existingLike = await prisma.like.findFirst({
      where: {
        video_id: videoId,
        user_id: userId,
      },
    });

    if (existingLike) {
      // Retirer le like
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      await prisma.video.update({
        where: { id: videoId },
        data: {
          likes: {
            decrement: 1,
          },
        },
      });

      return { liked: false };
    } else {
      // Ajouter le like
      await prisma.like.create({
        data: {
          video_id: videoId,
          user_id: userId,
        },
      });

      await prisma.video.update({
        where: { id: videoId },
        data: {
          likes: {
            increment: 1,
          },
        },
      });

      return { liked: true };
    }
  }

  async addComment(videoId: string, userId: string, content: string, parentId?: string) {
    // Valider le contenu
    if (!content || content.trim().length === 0) {
      const error: any = new Error('Le contenu du commentaire ne peut pas être vide');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        full_name: true,
        profile_image: true,
      },
    });

    if (!user) {
      const error: any = new Error('Utilisateur non trouvé');
      error.statusCode = 404;
      throw error;
    }

    const comment = await prisma.comment.create({
      data: {
        video_id: videoId,
        user_id: userId,
        content,
        parent_id: parentId,
        user_name: user.full_name || user.username,
        user_avatar: user.profile_image,
      },
    });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        comments_count: {
          increment: 1,
        },
      },
    });

    // Notifications : notifier le créateur de la vidéo (sauf si c'est lui qui commente)
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { creator_id: true },
    });
    const creatorId = video?.creator_id;
    const authorName = user.full_name || user.username || 'Quelqu\'un';
    if (creatorId && creatorId !== userId) {
      await prisma.notification.create({
        data: {
          user_id: creatorId,
          type: 'comment',
          title: 'Nouveau commentaire',
          message: `${authorName} a commenté votre vidéo`,
          reference_id: videoId,
          reference_type: 'video',
          from_user_id: userId,
          from_user_name: authorName,
        },
      });
    }

    // Si c'est une réponse : notifier l'auteur du commentaire parent (sauf si c'est lui ou le créateur)
    if (parentId && creatorId !== undefined) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { user_id: true },
      });
      const parentAuthorId = parent?.user_id;
      if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== creatorId) {
        await prisma.notification.create({
          data: {
            user_id: parentAuthorId,
            type: 'comment',
            title: 'Réponse à votre commentaire',
            message: `${authorName} a répondu à votre commentaire`,
            reference_id: videoId,
            reference_type: 'video',
            from_user_id: userId,
            from_user_name: authorName,
          },
        });
      }
    }

    return comment;
  }

  async updateComment(commentId: string, userId: string, data: { content?: string }) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true },
    });
    if (!comment) {
      const error: any = new Error('Commentaire non trouvé');
      error.statusCode = 404;
      throw error;
    }
    if (comment.user_id !== userId) {
      const error: any = new Error('Vous ne pouvez modifier que vos propres commentaires');
      error.statusCode = 403;
      throw error;
    }
    if (data.content === undefined || data.content.trim().length === 0) {
      return prisma.comment.findUnique({ where: { id: commentId } });
    }
    return prisma.comment.update({
      where: { id: commentId },
      data: { content: data.content.trim() },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true, video_id: true, parent_id: true },
    });
    if (!comment) {
      const error: any = new Error('Commentaire non trouvé');
      error.statusCode = 404;
      throw error;
    }
    if (comment.user_id !== userId) {
      const error: any = new Error('Vous ne pouvez supprimer que vos propres commentaires');
      error.statusCode = 403;
      throw error;
    }
    await prisma.comment.delete({ where: { id: commentId } });
    await prisma.video.update({
      where: { id: comment.video_id },
      data: { comments_count: { decrement: 1 } },
    });
    return { success: true };
  }

  async incrementShare(videoId: string) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        shares: {
          increment: 1,
        },
      },
    });

    return { success: true };
  }

  async getComments(videoId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          video_id: videoId,
          parent_id: null, // Commentaires principaux seulement
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
          replies: {
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
            orderBy: {
              created_at: 'asc',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.comment.count({
        where: {
          video_id: videoId,
          parent_id: null,
        },
      }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const videoService = new VideoService();
export default videoService;

