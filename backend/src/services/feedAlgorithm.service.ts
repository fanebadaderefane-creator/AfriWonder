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
  /** Pays client (header) ou profil — boost FYP localisation. */
  country?: string;
  category?: string;
  hashtag?: string;
  mediaType?: 'video' | 'image';
  refreshNonce?: string;
}) {
  return getPersonalizedFeed({
    limit: options.limit,
    page: options.page,
    userId: options.userId,
    deviceId: options.deviceId,
    country: options.country,
    category: options.category,
    hashtag: options.hashtag,
    mediaType: options.mediaType,
    refreshNonce: options.refreshNonce,
  });
}
