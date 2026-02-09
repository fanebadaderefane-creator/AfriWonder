import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class StoryService {
  async getStories(userIds: string[]) {
    const stories = await prisma.story.findMany({
      where: {
        user_id: { in: userIds },
        expires_at: { gt: new Date() },
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
      orderBy: { created_at: 'desc' },
    });

    return stories;
  }

  async getUserStories(userId: string) {
    const stories = await prisma.story.findMany({
      where: {
        user_id: userId,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    return stories;
  }

  async create(userId: string, data: {
    mediaUrl: string;
    mediaType: string;
    expiresInHours?: number;
  }) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 24));

    const story = await prisma.story.create({
      data: {
        user_id: userId,
        media_url: data.mediaUrl,
        media_type: data.mediaType,
        expires_at: expiresAt,
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

    logger.info('Story created', { userId, storyId: story.id });
    return story;
  }

  async viewStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Increment views count
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        views_count: { increment: 1 },
      },
    });

    logger.info('Story viewed', { storyId, userId });
    return updatedStory;
  }

  async delete(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story || story.user_id !== userId) {
      throw new Error('Story not found or unauthorized');
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    logger.info('Story deleted', { storyId, userId });
    return { success: true };
  }

  async cleanupExpired() {
    const result = await prisma.story.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });

    logger.info('Expired stories cleaned up', { count: result.count });
    return result;
  }
}

export default new StoryService();

