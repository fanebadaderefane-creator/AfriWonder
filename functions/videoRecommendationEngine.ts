import { api } from "@/api/expressClient";

export const VideoRecommendationEngine = {
  async getPersonalizedRecommendations(userId: string, limit = 10) {
    try {
      const [viewHistory, likedVideos, followingRes, videosRes] = await Promise.all([
        api.viewHistory.list({ limit: 100, order: "desc" }),
        api.users.getLikedVideos(userId, { limit: 50 }),
        api.users.getFollowing(userId),
        api.videos.list({ page: 1, limit: 500 }),
      ]);

      const historyList = Array.isArray(viewHistory) ? viewHistory : [];
      const watchedVideoIds = new Set(historyList.map((v: any) => v.video_id || v.video?.id));
      const likedVideoIds = new Set((likedVideos ?? []).map((v: any) => v.id));
      const following = Array.isArray(followingRes) ? followingRes : (followingRes as any)?.following ?? [];
      const followedCreatorIds = new Set(following.map((f: any) => f.id ?? f.following_id));
      const allVideos = Array.isArray(videosRes) ? videosRes : (videosRes as any)?.videos ?? (videosRes as any)?.data ?? [];

      const scoredVideos = allVideos
        .filter((v: any) => !watchedVideoIds.has(v.id))
        .map((video: any) => {
          let score = 0;
          if (followedCreatorIds.has(video.creator_id)) score += 30;
          const userCategories = historyList.slice(0, 20).map((h: any) => (h.video ?? {}).category).filter(Boolean);
          if (userCategories.includes(video.category)) score += 20;
          const engagement = (video.likes ?? 0) + (video.comments_count ?? 0) * 2 + (video.shares ?? 0) * 3;
          score += Math.min(25, (engagement / 100) * 25);
          const created = video.created_at ?? video.created_date;
          const daysSinceCreated = created ? (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24) : 999;
          if (daysSinceCreated < 7) score += 15;
          else if (daysSinceCreated < 30) score += 10;
          else if (daysSinceCreated < 90) score += 5;
          const avgWatchTime = video.average_watch_time ?? 0;
          const duration = video.duration ?? 1;
          score += Math.min(10, (avgWatchTime / duration) * 10);
          return { ...video, recommendationScore: score };
        })
        .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      return scoredVideos;
    } catch (error) {
      console.error("Recommendation engine error:", error);
      const fallback = await api.videos.list({ page: 1, limit });
      return Array.isArray(fallback) ? fallback : (fallback as any)?.videos ?? (fallback as any)?.data ?? [];
    }
  },

  async getTrendingVideos(limit = 10, _timeRange = "week") {
    try {
      const videosRes = await api.videos.list({ page: 1, limit: limit * 2 });
      const list = Array.isArray(videosRes) ? videosRes : (videosRes as any)?.videos ?? (videosRes as any)?.data ?? [];
      return list
        .map((v: any) => ({
          ...v,
          trendingScore: (v.views ?? 0) * 0.6 + ((v.likes ?? 0) + (v.comments_count ?? 0) * 2) * 0.4,
        }))
        .sort((a: any, b: any) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    } catch (error) {
      console.error("Trending videos error:", error);
      const fallback = await api.videos.list({ page: 1, limit });
      return Array.isArray(fallback) ? fallback : (fallback as any)?.videos ?? (fallback as any)?.data ?? [];
    }
  },

  async getSimilarVideos(videoId: string, limit = 6) {
    try {
      const video = await api.videos.getById(videoId);
      if (!video) return [];
      const videosRes = await api.videos.list({ page: 1, limit: 100, category: video.category });
      const list = Array.isArray(videosRes) ? videosRes : (videosRes as any)?.videos ?? (videosRes as any)?.data ?? [];
      const similarVideos = list
        .filter((v: any) => v.id !== videoId)
        .map((v: any) => {
          let similarity = 0;
          if (v.category === video.category) similarity += 40;
          if (v.creator_id === video.creator_id) similarity += 50;
          const baseTags = (video.hashtags ?? video.tags ?? []) as string[];
          const vTags = (v.hashtags ?? v.tags ?? []) as string[];
          const commonTags = baseTags.filter((t: string) => vTags.includes(t)).length;
          similarity += commonTags * 5;
          const baseLikeRate = (video.likes ?? 0) / Math.max(video.views ?? 1, 1);
          const vLikeRate = (v.likes ?? 0) / Math.max(v.views ?? 1, 1);
          if (Math.abs(baseLikeRate - vLikeRate) < 0.05) similarity += 20;
          return { ...v, similarity };
        })
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);
      return similarVideos;
    } catch (error) {
      console.error("Similar videos error:", error);
      return [];
    }
  },

  async trackVideoView(videoId: string, creatorId: string, userId: string, watchTimeSeconds = 0) {
    try {
      await api.viewHistory.record(videoId, watchTimeSeconds);
      await api.analytics.recordVideo({
        video_id: videoId,
        creator_id: creatorId,
        views: 1,
        watch_time_minutes: watchTimeSeconds / 60,
      });
    } catch (error) {
      console.error("Track video view error:", error);
    }
  },

  async getVideoAnalytics(videoId: string, days = 30) {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      const analytics = await api.analytics.getVideoAnalytics(videoId, start, end);
      const list = Array.isArray(analytics) ? analytics : [];
      if (list.length === 0) {
        return {
          totalViews: 0,
          totalWatchTime: 0,
          averageEngagementRate: 0,
          topTrafficSource: "direct",
          audienceLocations: [],
          audienceAgeGroups: [],
          audienceGender: {},
        };
      }
      return {
        totalViews: list.reduce((sum: number, a: any) => sum + (a.views ?? 0), 0),
        totalWatchTime: list.reduce((sum: number, a: any) => sum + (a.watch_time_minutes ?? 0), 0),
        averageEngagementRate: list.reduce((sum: number, a: any) => sum + (a.engagement_rate ?? 0), 0) / list.length,
        topTrafficSource: list[0]?.top_traffic_source ?? "direct",
        audienceLocations: list[0]?.audience_location ?? [],
        audienceAgeGroups: list[0]?.audience_age ?? [],
        audienceGender: list[0]?.audience_gender ?? {},
      };
    } catch (error) {
      console.error("Get video analytics error:", error);
      return null;
    }
  },

  _getDateFilter(timeRange: string) {
    const now = new Date();
    const days = timeRange.includes("d") ? parseInt(timeRange) : timeRange === "week" ? 7 : timeRange === "month" ? 30 : 7;
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return pastDate.toISOString();
  },
};
