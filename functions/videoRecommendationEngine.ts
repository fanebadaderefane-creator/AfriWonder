import { base44 } from "@/api/base44Client";

/**
 * Video Recommendation Engine
 * Recommends videos based on:
 * 1. User watch history and patterns
 * 2. Liked/saved videos
 * 3. Followed creators
 * 4. Video engagement metrics
 */

export const VideoRecommendationEngine = {
  /**
   * Get personalized video recommendations for a user
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const [viewHistory, likedVideos, followedCreators, allVideos] = await Promise.all([
        base44.entities.ViewHistory.filter({ user_id: userId }, "-created_date", 100),
        base44.entities.Like.filter({ user_id: userId, reference_type: "video" }, "-created_date", 50),
        base44.entities.Follow.filter({ follower_id: userId }, "-created_date", 50),
        base44.entities.Video.filter({ status: "published" }, "-views", 500)
      ]);

      // Extract categories and creator IDs from user preferences
      const watchedVideoIds = new Set(viewHistory.map(v => v.video_id));
      const likedVideoIds = new Set(likedVideos.map(l => l.reference_id));
      const followedCreatorIds = new Set(followedCreators.map(f => f.following_id));

      // Score and rank videos
      const scoredVideos = allVideos
        .filter(v => !watchedVideoIds.has(v.id)) // Exclude already watched
        .map(video => {
          let score = 0;

          // 1. Creator affinity (30 points)
          if (followedCreatorIds.has(video.creator_id)) {
            score += 30;
          }

          // 2. Category match (20 points)
          const userCategories = viewHistory
            .slice(0, 20)
            .map(v => allVideos.find(vid => vid.id === v.video_id)?.category);
          if (userCategories.includes(video.category)) {
            score += 20;
          }

          // 3. Engagement score (25 points - max)
          const engagement = (video.likes || 0) + (video.comments || 0) * 2 + (video.shares || 0) * 3;
          score += Math.min(25, (engagement / 100) * 25);

          // 4. Recency (15 points)
          const daysSinceCreated = (Date.now() - new Date(video.created_date).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCreated < 7) score += 15;
          else if (daysSinceCreated < 30) score += 10;
          else if (daysSinceCreated < 90) score += 5;

          // 5. Watch time and retention (10 points)
          const avgWatchTime = (video.average_watch_time || 0);
          const videoDuration = video.duration || 1;
          const retentionScore = (avgWatchTime / videoDuration) * 10;
          score += Math.min(10, retentionScore);

          return { ...video, recommendationScore: score };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      return scoredVideos;
    } catch (error) {
      console.error("Recommendation engine error:", error);
      // Fallback: return trending videos
      return base44.entities.Video.filter(
        { status: "published" },
        "-views",
        limit
      );
    }
  },

  /**
   * Get trending videos
   */
  async getTrendingVideos(limit = 10, timeRange = "week") {
    try {
      const dateFilter = this._getDateFilter(timeRange);

      const [trendingByViews, analytics] = await Promise.all([
        base44.entities.Video.filter(
          {
            status: "published",
            created_date: { $gte: dateFilter }
          },
          "-views",
          limit * 2
        ),
        base44.entities.VideoAnalytics.filter(
          { date: { $gte: dateFilter } },
          "-engagement_rate",
          limit * 2
        )
      ]);

      // Score by engagement rate and views
      const videoScores = {};
      analytics.forEach(a => {
        videoScores[a.video_id] = (videoScores[a.video_id] || 0) + (a.engagement_rate || 0);
      });

      return trendingByViews
        .map(v => ({
          ...v,
          trendingScore: (v.views || 0) * 0.6 + (videoScores[v.id] || 0) * 0.4
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    } catch (error) {
      console.error("Trending videos error:", error);
      return base44.entities.Video.filter({ status: "published" }, "-views", limit);
    }
  },

  /**
   * Get similar videos based on a specific video
   */
  async getSimilarVideos(videoId, limit = 6) {
    try {
      const video = await base44.entities.Video.filter({ id: videoId });
      if (!video.length) return [];

      const baseVideo = video[0];
      const allVideos = await base44.entities.Video.filter(
        { status: "published", id: { $ne: videoId } },
        "-views",
        100
      );

      const similarVideos = allVideos
        .map(v => {
          let similarity = 0;

          // Same category (40 points)
          if (v.category === baseVideo.category) similarity += 40;

          // Same creator (50 points)
          if (v.creator_id === baseVideo.creator_id) similarity += 50;

          // Similar tags (20 points)
          const commonTags = (v.tags || []).filter(tag =>
            (baseVideo.tags || []).includes(tag)
          ).length;
          similarity += commonTags * 5;

          // Similar engagement level (20 points)
          const baseLikeRate = (baseVideo.likes || 0) / Math.max(baseVideo.views || 1, 1);
          const videoLikeRate = (v.likes || 0) / Math.max(v.views || 1, 1);
          if (Math.abs(baseLikeRate - videoLikeRate) < 0.05) similarity += 20;

          return { ...v, similarity };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarVideos;
    } catch (error) {
      console.error("Similar videos error:", error);
      return [];
    }
  },

  /**
   * Track video view and update analytics
   */
  async trackVideoView(videoId, creatorId, userId, watchTimeSeconds = 0) {
    try {
      // Create/update view history
      const existingView = await base44.entities.ViewHistory.filter({
        user_id: userId,
        video_id: videoId
      });

      if (!existingView.length) {
        await base44.entities.ViewHistory.create({
          user_id: userId,
          video_id: videoId,
          last_watched: new Date().toISOString(),
          watch_count: 1,
          total_watch_time: watchTimeSeconds
        });
      } else {
        await base44.entities.ViewHistory.update(existingView[0].id, {
          watch_count: (existingView[0].watch_count || 0) + 1,
          total_watch_time: (existingView[0].total_watch_time || 0) + watchTimeSeconds,
          last_watched: new Date().toISOString()
        });
      }

      // Update video view count
      const video = await base44.entities.Video.filter({ id: videoId });
      if (video.length) {
        await base44.entities.Video.update(videoId, {
          views: (video[0].views || 0) + 1,
          average_watch_time: watchTimeSeconds
        });
      }

      // Log daily analytics
      const today = new Date().toISOString().split('T')[0];
      const existingAnalytics = await base44.entities.VideoAnalytics.filter({
        video_id: videoId,
        date: today
      });

      if (!existingAnalytics.length) {
        await base44.entities.VideoAnalytics.create({
          video_id: videoId,
          creator_id: creatorId,
          date: today,
          views: 1,
          watch_time_minutes: watchTimeSeconds / 60
        });
      } else {
        await base44.entities.VideoAnalytics.update(existingAnalytics[0].id, {
          views: (existingAnalytics[0].views || 0) + 1,
          watch_time_minutes: (existingAnalytics[0].watch_time_minutes || 0) + (watchTimeSeconds / 60)
        });
      }
    } catch (error) {
      console.error("Track video view error:", error);
    }
  },

  /**
   * Get video analytics summary
   */
  async getVideoAnalytics(videoId, days = 30) {
    try {
      const dateFilter = this._getDateFilter(`${days}d`);
      const analytics = await base44.entities.VideoAnalytics.filter({
        video_id: videoId,
        date: { $gte: dateFilter }
      });

      if (!analytics.length) {
        return {
          totalViews: 0,
          totalWatchTime: 0,
          averageEngagementRate: 0,
          topTrafficSource: "direct",
          audienceLocations: [],
          audienceAgeGroups: [],
          audienceGender: {}
        };
      }

      return {
        totalViews: analytics.reduce((sum, a) => sum + (a.views || 0), 0),
        totalWatchTime: analytics.reduce((sum, a) => sum + (a.watch_time_minutes || 0), 0),
        averageEngagementRate: (analytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0) / analytics.length),
        topTrafficSource: analytics[0]?.top_traffic_source || "direct",
        audienceLocations: analytics[0]?.audience_location || [],
        audienceAgeGroups: analytics[0]?.audience_age || [],
        audienceGender: analytics[0]?.audience_gender || {}
      };
    } catch (error) {
      console.error("Get video analytics error:", error);
      return null;
    }
  },

  /**
   * Helper: Get date filter for time range
   */
  _getDateFilter(timeRange) {
    const now = new Date();
    const days = timeRange.includes('d') ? parseInt(timeRange) : 
                 timeRange === 'week' ? 7 :
                 timeRange === 'month' ? 30 : 7;
    
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return pastDate.toISOString();
  }
};