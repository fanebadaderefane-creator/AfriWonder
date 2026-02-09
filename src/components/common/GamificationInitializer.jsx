import { useEffect } from 'react';
import { api } from '@/api/expressClient';
import GamificationService from './GamificationService';
import PushNotificationService from './PushNotificationService';

/**
 * Initialize gamification and notifications for a user
 * Should be called once when user logs in
 */
export const useGamificationInit = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const initializeGamification = async () => {
      try {
        // Initialize user points if not exists
        const points = await api.entities.UserPoints.filter({ user_id: userId });
        if (points.length === 0) {
          await api.entities.UserPoints.create({
            user_id: userId,
            total_points: 0,
            points_this_month: 0,
            level: 1,
            rank: 'bronze'
          });
        }

        // Initialize notification preferences
        await PushNotificationService.createNotificationPreference(userId);

        // Request push notification permission
        if ('Notification' in window) {
          await PushNotificationService.registerServiceWorker();
        }

        // Check for badge eligibility
        const userStats = await GamificationService.getUserStats(userId);
        
        // First video badge
        if (userStats.videos >= 1) {
          await GamificationService.checkAndAwardBadge(userId, 'first_video');
        }

        // 100 followers badge
        if (userStats.followers >= 100) {
          await GamificationService.checkAndAwardBadge(userId, '100_followers');
        }

        // Content creator badge
        if (userStats.videos >= 10) {
          await GamificationService.checkAndAwardBadge(userId, 'content_creator');
        }

        // Video star badge
        if (userStats.totalLikes >= 10000) {
          await GamificationService.checkAndAwardBadge(userId, 'video_star');
        }

        // Community hero badge
        if (userStats.totalComments >= 500) {
          await GamificationService.checkAndAwardBadge(userId, 'community_hero');
        }

      } catch (_error) {
        console.error('Erreur initialisation gamification:', error);
      }
    };

    initializeGamification();
  }, [userId]);
};

export default useGamificationInit;


