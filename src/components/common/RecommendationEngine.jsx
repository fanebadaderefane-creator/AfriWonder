import { api } from '@/api/expressClient';

/**
 * Recommendation Engine for personalized content discovery
 */
export class RecommendationEngine {
  
  /**
   * Track video view
   */
  static async trackVideoView(userId, videoId, durationWatched, totalDuration) {
    try {
      const video = await api.videos.list({ page: 1, limit: 50 });
      if (video.length === 0) return null;

      const v = video[0];
      const percentage = (durationWatched / totalDuration) * 100;

      return await api.entities.ViewHistory.create({
        user_id: userId,
        video_id: videoId,
        video_title: v.title,
        creator_id: v.creator_id,
        category: v.category,
        duration_watched: durationWatched,
        total_duration: totalDuration,
        completion_percentage: Math.round(percentage),
        watched_at: new Date().toISOString()
      });
    } catch (_error) {
      console.error('Erreur tracking view:', error);
      return null;
    }
  }

  /**
   * Get user preferences based on viewing history
   */
  static async getUserPreferences(userId) {
    try {
      const history = await api.entities.ViewHistory.filter(
        { user_id: userId },
        '-watched_at',
        100
      );

      if (history.length === 0) {
        return {
          topCategories: [],
          favoriteCreators: [],
          watchedVideos: [],
          avgCompletionRate: 0
        };
      }

      // Calculate category preferences
      const categoryMap = {};
      const creatorMap = {};
      let totalCompletion = 0;

      history.forEach(view => {
        // Categories
        if (view.category) {
          categoryMap[view.category] = (categoryMap[view.category] || 0) + 1;
        }

        // Creators
        if (view.creator_id) {
          if (!creatorMap[view.creator_id]) {
            creatorMap[view.creator_id] = {
              count: 0,
              title: view.video_title?.split(' ')[0] || 'Creator'
            };
          }
          creatorMap[view.creator_id].count++;
        }

        totalCompletion += view.completion_percentage || 0;
      });

      // Sort and get top items
      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => ({ category: cat, count }));

      const favoriteCreators = Object.entries(creatorMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, data]) => ({ creator_id: id, ...data }));

      return {
        topCategories,
        favoriteCreators,
        watchedVideos: history.map(h => h.video_id),
        avgCompletionRate: Math.round(totalCompletion / history.length)
      };
    } catch (_error) {
      console.error('Erreur préférences utilisateur:', error);
      return null;
    }
  }

  /**
   * Get video recommendations based on user preferences
   */
  static async getVideoRecommendations(userId, limit = 20) {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return [];

      // Get all videos
      const allVideos = await api.videos.list({ page: 1, limit: 50 });
      
      const userHistory = preferences.watchedVideos || [];
      const topCategories = preferences.topCategories.map(c => c.category);
      const creatorIds = preferences.favoriteCreators.map(c => c.creator_id);

      // Score videos
      const scoredVideos = allVideos
        .filter(v => !userHistory.includes(v.id))
        .map(video => {
          let score = 0;

          // Category match (+100)
          if (topCategories.includes(video.category)) {
            score += 100;
          }

          // Creator match (+150)
          if (creatorIds.includes(video.creator_id)) {
            score += 150;
          }

          // Engagement metrics
          score += (video.likes || 0) * 0.1;
          score += (video.views || 0) * 0.01;
          score += (video.comments_count || 0) * 0.5;

          // Recently published (+50)
          const daysOld = (new Date() - new Date(video.created_date)) / (1000 * 60 * 60 * 24);
          if (daysOld < 7) score += 50;

          return { ...video, recommendationScore: score };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      return scoredVideos;
    } catch (_error) {
      console.error('Erreur recommandations vidéos:', error);
      return [];
    }
  }

  /**
   * Get creator recommendations
   */
  static async getCreatorRecommendations(userId, limit = 10) {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return [];

      const followingIds = await api.users.getFollowing(userId);
      const followedIds = followingIds.map(f => f.following_id);

      // Get creators with content in user's preferred categories
      const topCategories = preferences.topCategories.map(c => c.category);
      
      const videos = await api.videos.list({ page: 1, limit: 50 });

      // Get unique creators
      const creatorMap = {};
      videos.forEach(video => {
        if (!creatorMap[video.creator_id]) {
          creatorMap[video.creator_id] = {
            creator_id: video.creator_id,
            name: video.creator_name,
            avatar: video.creator_avatar,
            videoCount: 0,
            totalLikes: 0
          };
        }
        creatorMap[video.creator_id].videoCount++;
        creatorMap[video.creator_id].totalLikes += video.likes || 0;
      });

      // Filter out followed creators and score
      const recommendations = Object.values(creatorMap)
        .filter(c => !followedIds.includes(c.creator_id))
        .map(c => ({
          ...c,
          score: (c.videoCount * 10) + (c.totalLikes * 0.1)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (_error) {
      console.error('Erreur recommandations créateurs:', error);
      return [];
    }
  }

  /**
   * Get course recommendations
   */
  static async getCourseRecommendations(userId, limit = 10) {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return [];

      // Map video categories to course categories
      const categoryMap = {
        'tech': 'tech',
        'business': 'business',
        'education': 'education',
        'lifestyle': 'business',
        'musique': 'art'
      };

      const preferredCourseCategories = preferences.topCategories
        .map(c => categoryMap[c.category])
        .filter(Boolean);

      const enrollments = await api.entities.Enrollment.filter(
        { student_id: userId }
      );
      const enrolledCourseIds = enrollments.map(e => e.course_id);

      // Get courses
      let courses = await api.entities.Course.filter(
        { is_published: true }
      );

      const recommendations = courses
        .filter(c => !enrolledCourseIds.includes(c.id))
        .map(course => ({
          ...course,
          matchScore: preferredCourseCategories.includes(course.category) ? 100 : 0
            + (course.rating || 0) * 10
            + (course.enrolled_count || 0) * 0.1
        }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return recommendations;
    } catch (_error) {
      console.error('Erreur recommandations cours:', error);
      return [];
    }
  }

  /**
   * Get event recommendations
   */
  static async getEventRecommendations(userId, limit = 10) {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return [];

      // Get user's interested categories
      const categories = preferences.topCategories.map(c => c.category);

      // Get all upcoming events
      const now = new Date();
      let events = await api.entities.Event.list('-created_date', 100);

      // Filter upcoming events with user interests
      const recommendations = events
        .filter(e => new Date(e.start_date) > now && 
                    (!e.category || categories.includes(e.category)))
        .map(event => ({
          ...event,
          relevanceScore: 
            (categories.includes(event.category) ? 100 : 0) +
            (event.interested_count || 0) * 0.1
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return recommendations;
    } catch (_error) {
      console.error('Erreur recommandations événements:', error);
      return [];
    }
  }

  /**
   * Get trending videos
   */
  static async getTrendingVideos(limit = 15, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const videos = await api.videos.list({ page: 1, limit: 50 });

      const trending = videos
        .filter(v => new Date(v.created_date) > cutoffDate)
        .map(v => ({
          ...v,
          trendingScore: 
            (v.likes || 0) * 2 +
            (v.views || 0) * 0.01 +
            (v.comments_count || 0) * 5 +
            (v.shares || 0) * 10
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      return trending;
    } catch (_error) {
      console.error('Erreur vidéos tendance:', error);
      return [];
    }
  }

  /**
   * Get personalized feed
   */
  static async getPersonalizedFeed(userId, limit = 50) {
    try {
      const [recommendations, trending] = await Promise.all([
        this.getVideoRecommendations(userId, limit),
        this.getTrendingVideos(Math.floor(limit * 0.3))
      ]);

      // Mix recommendations and trending (70% recommendations, 30% trending)
      const recommendationCount = Math.floor(limit * 0.7);
      const trendingCount = limit - recommendationCount;

      const mixed = [
        ...recommendations.slice(0, recommendationCount),
        ...trending.slice(0, trendingCount)
      ];

      // Shuffle while keeping some order
      return mixed.sort((a, b) => {
        const aScore = a.recommendationScore || 0;
        const bScore = b.trendingScore || b.recommendationScore || 0;
        return bScore - aScore;
      });
    } catch (_error) {
      console.error('Erreur feed personnalisé:', error);
      return [];
    }
  }
}

export default RecommendationEngine;


