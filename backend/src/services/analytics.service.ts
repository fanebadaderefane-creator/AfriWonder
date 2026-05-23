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

  async recordVideoAnalytics(data: {
    video_id: string;
    creator_id: string;
    date?: Date;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    watch_time_minutes?: number;
    engagement_rate?: number;
    revenue?: number;
  }) {
    const date = data.date ? new Date(data.date) : new Date();
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const existing = await prisma.videoAnalytics.findFirst({
      where: { video_id: data.video_id, date: dayStart },
    });

    const inc = {
      views: data.views ?? 0,
      likes: data.likes ?? 0,
      comments: data.comments ?? 0,
      shares: data.shares ?? 0,
      watch_time_minutes: data.watch_time_minutes ?? 0,
      revenue: data.revenue ?? 0,
    };

    if (existing) {
      return prisma.videoAnalytics.update({
        where: { id: existing.id },
        data: {
          views: existing.views + inc.views,
          likes: existing.likes + inc.likes,
          comments: existing.comments + inc.comments,
          shares: existing.shares + inc.shares,
          watch_time_minutes: existing.watch_time_minutes + inc.watch_time_minutes,
          revenue: existing.revenue + inc.revenue,
          engagement_rate: data.engagement_rate ?? existing.engagement_rate,
        },
      });
    }

    return prisma.videoAnalytics.create({
      data: {
        video_id: data.video_id,
        creator_id: data.creator_id,
        date: dayStart,
        views: inc.views || 1,
        likes: inc.likes,
        comments: inc.comments,
        shares: inc.shares,
        watch_time_minutes: inc.watch_time_minutes,
        engagement_rate: data.engagement_rate ?? 0,
        revenue: inc.revenue,
      },
    });
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

