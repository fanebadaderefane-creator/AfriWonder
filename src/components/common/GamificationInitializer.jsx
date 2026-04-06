import { useEffect } from 'react';
import { api } from '@/api/expressClient';
import { checkAndAwardBadges } from './GamificationService';
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

        // PWA : enregistrer le SW + abonnement Web Push (nécessaire pour notifier hors de l’app)
        if ('Notification' in window && 'serviceWorker' in navigator) {
          await PushNotificationService.registerServiceWorker();
          try {
            await PushNotificationService.subscribeToPushNotifications(userId);
          } catch {
            // iOS / politique navigateur : parfois sans geste utilisateur ; NotificationSettings permet de réessayer
          }
        }

        // Badges alignés sur badgeDefinitions (première vidéo, 10 vidéos, paliers followers, créateur, etc.)
        await checkAndAwardBadges(userId);

      } catch (err) {
        console.error('Erreur initialisation gamification:', err);
      }
    };

    initializeGamification();
  }, [userId]);
};

export default useGamificationInit;


