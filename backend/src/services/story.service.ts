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
        reactions: { select: { id: true, user_id: true, emoji: true } },
        poll: {
          include: {
            votes: { select: { option_index: true } },
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
      include: {
        reactions: { select: { id: true, user_id: true, emoji: true } },
        poll: {
          include: {
            votes: { select: { option_index: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return stories;
  }

  async create(userId: string, data: {
    mediaUrl: string;
    mediaType: string;
    expiresInHours?: number;
    poll?: { question: string; options: string[] };
  }) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 24));

    const story = await prisma.story.create({
      data: {
        user_id: userId,
        media_url: data.mediaUrl,
        media_type: data.mediaType,
        expires_at: expiresAt,
        ...(data.poll && {
          poll: {
            create: {
              question: data.poll.question,
              options: data.poll.options,
            },
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_image: true,
          },
        },
        reactions: true,
        poll: true,
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

  // --- CPO 2.19 Réactions ---
  async addReaction(storyId: string, userId: string, emoji: string = '❤️') {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.expires_at < new Date()) {
      throw new Error('Story not found or expired');
    }
    const reaction = await prisma.storyReaction.upsert({
      where: {
        story_id_user_id: { story_id: storyId, user_id: userId },
      },
      create: { story_id: storyId, user_id: userId, emoji },
      update: { emoji },
    });
    return reaction;
  }

  async removeReaction(storyId: string, userId: string) {
    await prisma.storyReaction.deleteMany({
      where: { story_id: storyId, user_id: userId },
    });
    return { success: true };
  }

  async getReactions(storyId: string) {
    return prisma.storyReaction.findMany({
      where: { story_id: storyId },
      include: {
        user: { select: { id: true, username: true, profile_image: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // --- CPO 2.21 Sondages ---
  async votePoll(pollId: string, userId: string, optionIndex: number) {
    const poll = await prisma.storyPoll.findUnique({
      where: { id: pollId },
      include: { story: true },
    });
    if (!poll || (poll.story.expires_at && poll.story.expires_at < new Date())) {
      throw new Error('Poll not found or story expired');
    }
    const options = poll.options as string[];
    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new Error('Invalid option index');
    }
    const vote = await prisma.storyPollVote.upsert({
      where: {
        poll_id_user_id: { poll_id: pollId, user_id: userId },
      },
      create: { poll_id: pollId, user_id: userId, option_index: optionIndex },
      update: { option_index: optionIndex },
    });
    return vote;
  }

  async getPollResults(pollId: string) {
    const poll = await prisma.storyPoll.findUnique({
      where: { id: pollId },
      include: { votes: true },
    });
    if (!poll) throw new Error('Poll not found');
    const options = (poll.options as string[]) || [];
    const counts = options.map((_, i) => poll.votes.filter((v) => v.option_index === i).length);
    return { question: poll.question, options, counts, total: poll.votes.length };
  }
}

export default new StoryService();

