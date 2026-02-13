/**
 * Feed combiné : vidéos organiques + publicités In-Feed
 * Fréquence : 1 pub tous les 4 à 5 contenus (CDC Phase 1)
 */
import { videoService } from './video.service.js';
import { adsService } from './ads.service.js';

const AD_FREQUENCY_MIN = 4; // 1 ad après au moins 4 vidéos
const AD_FREQUENCY_MAX = 5;

export interface FeedItem {
  type: 'video' | 'ad';
  index: number;
  video?: any;
  ad?: {
    id: string;
    campaign_id: string;
    creative: any;
    advertiser: any;
    ad_type: string;
  };
}

export interface FeedOptions {
  page?: number;
  limit?: number;
  userId?: string;
  deviceId?: string;
  country?: string;
  city?: string;
  age?: number;
  gender?: string;
  category?: string;
  hashtag?: string;
}

class FeedService {
  /**
   * Construit le feed combiné : vidéos + pubs insérées tous les 4-5 contenus
   */
  async getFeed(options: FeedOptions): Promise<{ items: FeedItem[]; pagination: any }> {
    const limit = options.limit || 50;
    const page = options.page || 1;

    const [videoResult, ads] = await Promise.all([
      videoService.list({
        page,
        limit: limit + 20, // Buffer pour insertion des pubs
        visibility: 'public',
        userId: options.userId,
        category: options.category,
        hashtag: options.hashtag,
      }),
      adsService.getActiveAdsForFeed(Math.ceil(limit / AD_FREQUENCY_MIN) + 5, {
        userId: options.userId,
        deviceId: options.deviceId,
        country: options.country,
        city: options.city,
        age: options.age,
        gender: options.gender,
      }),
    ]);

    const videos = videoResult.videos || [];
    const pagination = videoResult.pagination || { page, limit, total: videos.length, totalPages: 1 };

    const items: FeedItem[] = [];
    let videoIdx = 0;
    let adIdx = 0;
    let sinceLastAd = 0;
    const adInterval = AD_FREQUENCY_MIN + Math.floor(Math.random() * (AD_FREQUENCY_MAX - AD_FREQUENCY_MIN + 1));

    while (videoIdx < videos.length && items.length < limit) {
      // Insérer une pub tous les adInterval contenus
      if (ads.length > 0 && sinceLastAd >= adInterval && adIdx < ads.length) {
        const ad = ads[adIdx];
        items.push({
          type: 'ad',
          index: items.length,
          ad: {
            id: ad.creative?.id || ad.campaign_id,
            campaign_id: ad.campaign_id,
            creative: ad.creative,
            advertiser: ad.advertiser,
            ad_type: ad.ad_type,
          },
        });
        adIdx++;
        sinceLastAd = 0;
      }

      if (videoIdx < videos.length) {
        items.push({
          type: 'video',
          index: items.length,
          video: videos[videoIdx],
        });
        videoIdx++;
        sinceLastAd++;
      }
    }

    return { items, pagination };
  }
}

export const feedService = new FeedService();
export default feedService;
