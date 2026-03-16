/**
 * AfriWonder - Algorithme type TikTok
 * Délègue au système de recommandation complet (personnalisation + diversité + cold start)
 */
import { getPersonalizedFeed } from './recommendation.service.js';

export async function getAlgorithmFeed(options: {
  limit?: number;
  page?: number;
  userId?: string;
  deviceId?: string;
  category?: string;
  hashtag?: string;
  mediaType?: 'video' | 'image';
}) {
  return getPersonalizedFeed({
    limit: options.limit,
    page: options.page,
    userId: options.userId,
    deviceId: options.deviceId,
    category: options.category,
    hashtag: options.hashtag,
    mediaType: options.mediaType,
  });
}
