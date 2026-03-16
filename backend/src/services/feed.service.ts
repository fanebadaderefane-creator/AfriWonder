/**
 * Feed combiné : vidéos organiques (algo TikTok) + publicités In-Feed
 * Fréquence : 1 pub tous les 4 à 5 contenus (CDC Phase 1)
 */
import { getAlgorithmFeed } from './feedAlgorithm.service.js';
import { adsService } from './ads.service.js';

const AD_FREQUENCY_MIN = 4; // 1 ad après au moins 4 vidéos
const AD_FREQUENCY_MAX = 5;

export interface FeedItem {
  type: 'video' | 'ad' | 'top_banner';
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
  mediaType?: 'video' | 'image';
}

class FeedService {
  /**
   * Construit le feed combiné : vidéos + pubs insérées tous les 4-5 contenus
   */
  async getFeed(options: FeedOptions): Promise<{ items: FeedItem[]; pagination: any }> {
    const limit = options.limit || 50;
    const page = options.page || 1;

    const [videoResult, inFeedAds, topBannerAds] = await Promise.all([
      getAlgorithmFeed({
        page,
        limit: limit + 20,
        userId: options.userId,
        deviceId: options.deviceId,
        category: options.category,
        hashtag: options.hashtag,
        mediaType: options.mediaType,
      }),
      adsService.getActiveAdsForFeed(Math.ceil(limit / AD_FREQUENCY_MIN) + 5, {
        userId: options.userId,
        deviceId: options.deviceId,
        country: options.country,
        city: options.city,
        age: options.age,
        gender: options.gender,
      }),
      adsService.getTopBannerAds(2, {
        userId: options.userId,
        deviceId: options.deviceId,
        country: options.country,
        city: options.city,
        age: options.age,
        gender: options.gender,
      }),
    ]);

    const rawVideos = videoResult.videos || [];
    // Éviter les doublons de vidéos dans un même batch de feed (même id répété)
    const seenIds = new Set<string>();
    const videos = rawVideos.filter((v: any) => {
      const id = v?.id != null ? String(v.id) : undefined;
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    const pagination = videoResult.pagination || { page, limit, total: videos.length, totalPages: 1 };

    const items: FeedItem[] = [];

    // CDC §2 Top Banner Ads - en haut du feed
    for (let i = 0; i < topBannerAds.length; i++) {
      const ad = topBannerAds[i];
      items.push({
        type: 'top_banner',
        index: items.length,
        ad: {
          id: ad.creative?.id || ad.campaign_id,
          campaign_id: ad.campaign_id,
          creative: ad.creative,
          advertiser: ad.advertiser,
          ad_type: 'top_banner',
        },
      });
    }
    let videoIdx = 0;
    let adIdx = 0;
    let sinceLastAd = 0;
    const adInterval = AD_FREQUENCY_MIN + Math.floor(Math.random() * (AD_FREQUENCY_MAX - AD_FREQUENCY_MIN + 1));

    while (videoIdx < videos.length && items.length < limit) {
      // Insérer une pub tous les adInterval contenus
      if (inFeedAds.length > 0 && sinceLastAd >= adInterval && adIdx < inFeedAds.length) {
        const ad = inFeedAds[adIdx];
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
