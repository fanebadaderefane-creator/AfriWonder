import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class AnalyticsService {
  async getVideoAnalytics(videoId: string, startDate?: Date, endDate?: Date) {
    const where: any = { video_id: videoId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const analytics = await prisma.videoAnalytics.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return analytics;
  }

  async getCreatorAnalytics(creatorId: string, startDate?: Date, endDate?: Date) {
    const where: any = { creator_id: creatorId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const analytics = await prisma.videoAnalytics.findMany({
      where,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnail_url: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate totals
    const totals = analytics.reduce((acc, a) => ({
      views: acc.views + a.views,
      likes: acc.likes + a.likes,
      comments: acc.comments + a.comments,
      shares: acc.shares + a.shares,
      watchTime: acc.watchTime + a.watch_time_minutes,
      revenue: acc.revenue + a.revenue,
    }), {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      watchTime: 0,
      revenue: 0,
    });

    return {
      analytics,
      totals,
    };
  }

  async createAnalytics(data: {
    userId?: string;
    entityType: string;
    entityId: string;
    metricType: string;
    metricValue: number;
    metadata?: any;
  }) {
    const analytics = await prisma.analytics.create({
      data: {
        user_id: data.userId,
        entity_type: data.entityType,
        entity_id: data.entityId,
        metric_type: data.metricType,
        metric_value: data.metricValue,
        metadata: data.metadata,
      },
    });

    logger.info('Analytics created', { analyticsId: analytics.id });
    return analytics;
  }

  async getAnalytics(entityType: string, entityId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      entity_type: entityType,
      entity_id: entityId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const analytics = await prisma.analytics.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return analytics;
  }
}

export default new AnalyticsService();

