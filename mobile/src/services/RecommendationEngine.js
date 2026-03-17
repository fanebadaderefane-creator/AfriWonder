/**
 * Recommendation Engine — recommandations personnalisées (parité PWA)
 * getPersonalizedFeed, getCreatorRecommendations, getCourseRecommendations, getEventRecommendations
 */
import { api } from '../api/client';

export class RecommendationEngine {
  static async trackVideoView(userId, videoId, durationWatched, totalDuration) {
    try {
      const pct = totalDuration > 0 ? (durationWatched / totalDuration) * 100 : 0;
      await api.viewHistory.record(videoId, Math.round(durationWatched), pct);
      return { ok: true };
    } catch (e) {
      console.warn('RecommendationEngine.trackVideoView:', e);
      return null;
    }
  }

  static async getUserPreferences(userId) {
    try {
      const list = await api.viewHistory.list({ limit: 200 });
      const arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) {
        return { topCategories: [], favoriteCreators: [], watchedVideos: [], avgCompletionRate: 0 };
      }
      const categoryMap = {};
      const creatorMap = {};
      let totalCompletion = 0;
      arr.forEach((view) => {
        const cat = view.video?.category ?? view.category;
        if (cat) categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        const cid = view.video?.creator_id;
        if (cid) {
          if (!creatorMap[cid]) creatorMap[cid] = { count: 0, creator_id: cid };
          creatorMap[cid].count++;
        }
        totalCompletion += view.watch_percent ?? 0;
      });
      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => ({ category: cat, count }));
      const favoriteCreators = Object.entries(creatorMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([, data]) => ({ creator_id: data.creator_id, ...data }));
      return {
        topCategories,
        favoriteCreators,
        watchedVideos: arr.map((h) => h.video_id),
        avgCompletionRate: Math.round(totalCompletion / arr.length) || 0,
      };
    } catch (e) {
      console.warn('RecommendationEngine.getUserPreferences:', e);
      return null;
    }
  }

  static async getVideoRecommendations(userId, limit = 20) {
    try {
      const res = await api.feed.list({ page: 1, limit });
      const items = res?.items ?? [];
      return items.filter((i) => i.type === 'video' && i.video).map((i) => i.video).slice(0, limit);
    } catch (e) {
      console.warn('RecommendationEngine.getVideoRecommendations:', e);
      return [];
    }
  }

  static async getCreatorRecommendations(userId, limit = 10) {
    try {
      const followRes = await api.users.getFollowing(userId);
      const following = followRes?.following ?? followRes ?? [];
      const followedIds = new Set(
        Array.isArray(following) ? following.map((f) => f.id ?? f.following_id) : []
      );
      const vRes = await api.videos.list({ page: 1, limit: 80 });
      const videos = vRes?.videos ?? (Array.isArray(vRes) ? vRes : []);
      const creatorMap = {};
      videos.forEach((v) => {
        const cid = v.creator_id;
        if (followedIds.has(cid)) return;
        if (!creatorMap[cid]) {
          creatorMap[cid] = {
            creator_id: cid,
            name: v.creator_name,
            avatar: v.creator_avatar,
            videoCount: 0,
            totalLikes: 0,
          };
        }
        creatorMap[cid].videoCount++;
        creatorMap[cid].totalLikes += v.likes || 0;
      });
      return Object.values(creatorMap)
        .sort((a, b) => b.totalLikes + b.videoCount * 10 - (a.totalLikes + a.videoCount * 10))
        .slice(0, limit);
    } catch (e) {
      console.warn('RecommendationEngine.getCreatorRecommendations:', e);
      return [];
    }
  }

  static async getCourseRecommendations(userId, limit = 10) {
    try {
      const res = await api.courses.list({ limit: 50 });
      const courses = res?.courses ?? res ?? [];
      return Array.isArray(courses) ? courses.slice(0, limit) : [];
    } catch (e) {
      console.warn('RecommendationEngine.getCourseRecommendations:', e);
      return [];
    }
  }

  static async getEventRecommendations(userId, limit = 10) {
    try {
      const res = await api.events.list({ limit: 50 });
      const events = res?.events ?? res ?? [];
      const list = Array.isArray(events) ? events : [];
      const now = new Date();
      return list
        .filter((e) => new Date(e.start_date || e.startDate) > now)
        .slice(0, limit);
    } catch (e) {
      console.warn('RecommendationEngine.getEventRecommendations:', e);
      return [];
    }
  }

  static async getPersonalizedFeed(userId, limit = 50) {
    try {
      const res = await api.feed.list({ page: 1, limit });
      const items = res?.items ?? [];
      return items.filter((i) => i.type === 'video' && i.video).map((i) => i.video).slice(0, limit);
    } catch (e) {
      console.warn('RecommendationEngine.getPersonalizedFeed:', e);
      return [];
    }
  }

  static async getTrendingVideos(limit = 15) {
    try {
      const res = await api.feed.list({ page: 1, limit: limit + 10 });
      const items = res?.items ?? [];
      return items.filter((i) => i.type === 'video' && i.video).map((i) => i.video).slice(0, limit);
    } catch (e) {
      console.warn('RecommendationEngine.getTrendingVideos:', e);
      return [];
    }
  }
}

export default RecommendationEngine;
