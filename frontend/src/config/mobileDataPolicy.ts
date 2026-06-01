import { Platform } from 'react-native';

/**
 * Économie de données **sans** sacrifier la fluidité type TikTok :
 * - qualité vidéo adaptée (Mo) + moins de polling / cache-bust ;
 * - scroll feed inchangé (précharge 1–2 écrans, throttle 16 ms, pages assez grandes).
 */

/** 1er écran : assez de cartes pour swiper sans attendre, pas 28 d’un coup. */
export const FEED_PAGE_LIMIT_DATA_SAVER = 14;
export const FEED_PAGE_LIMIT_STANDARD = 20;

export type FeedScrollTuning = {
  windowSize: number;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  scrollEventThrottle: number;
  /** Multiplicateur × hauteur de slide pour FlashList `drawDistance`. */
  drawDistanceMultiplier: number;
  onEndReachedThreshold: number;
};

/** Intervalles polling secondaires (ms) — réseau cellulaire / économie. */
export const STORIES_BAR_REFRESH_MS_DATA_SAVER = 90_000;
export const STORIES_BAR_REFRESH_MS_STANDARD = 45_000;
export const LIVE_HUB_HINT_REFRESH_MS_DATA_SAVER = 120_000;
export const LIVE_HUB_HINT_REFRESH_MS_STANDARD = 75_000;
export const DISCOVER_LIVE_STRIP_REFRESH_MS_DATA_SAVER = 60_000;
export const DISCOVER_LIVE_STRIP_REFRESH_MS_STANDARD = 20_000;

export function getFeedPageLimit(effectiveDataSaver: boolean): number {
  return effectiveDataSaver ? FEED_PAGE_LIMIT_DATA_SAVER : FEED_PAGE_LIMIT_STANDARD;
}

export function shouldPreferLowQualityPlayback(effectiveDataSaver: boolean, isOnCellular: boolean): boolean {
  if (effectiveDataSaver) return true;
  return Platform.OS !== 'web' && isOnCellular;
}

export function getStoriesBarRefreshMs(effectiveDataSaver: boolean): number {
  return effectiveDataSaver ? STORIES_BAR_REFRESH_MS_DATA_SAVER : STORIES_BAR_REFRESH_MS_STANDARD;
}

export function getLiveHubHintRefreshMs(effectiveDataSaver: boolean): number {
  return effectiveDataSaver ? LIVE_HUB_HINT_REFRESH_MS_DATA_SAVER : LIVE_HUB_HINT_REFRESH_MS_STANDARD;
}

export function getDiscoverLiveStripRefreshMs(effectiveDataSaver: boolean): number {
  return effectiveDataSaver ? DISCOVER_LIVE_STRIP_REFRESH_MS_DATA_SAVER : DISCOVER_LIVE_STRIP_REFRESH_MS_STANDARD;
}

/** Préchargement miniatures Discover via téléchargement partiel de la vidéo — très coûteux en Mo. */
export function shouldSkipDiscoverVideoPrefetch(effectiveDataSaver: boolean, isOnCellular: boolean): boolean {
  return effectiveDataSaver || (Platform.OS !== 'web' && isOnCellular);
}

/** 0 = posters API uniquement ; quelques tuiles max hors économie. */
export function getDiscoverVideoPrefetchCap(effectiveDataSaver: boolean, isOnCellular: boolean): number {
  if (shouldSkipDiscoverVideoPrefetch(effectiveDataSaver, isOnCellular)) return 0;
  return Platform.OS === 'android' ? 6 : 10;
}

export function getDiscoverVideosPageLimit(effectiveDataSaver: boolean): number {
  return effectiveDataSaver ? 12 : 24;
}

/** Ne pas multiplier les appels `/live/:id` pour valider chaque stream. */
export function shouldVerifyDiscoverLiveStreamsIndividually(effectiveDataSaver: boolean, isOnCellular: boolean): boolean {
  return !effectiveDataSaver && !isOnCellular;
}

/** Liste utilisateurs complète (150 comptes) pour la barre stories — éviter en forfait. */
export function shouldFetchAllUsersForDiscoverStories(effectiveDataSaver: boolean, isOnCellular: boolean): boolean {
  return !effectiveDataSaver && !isOnCellular;
}

/** Socket : éviter le fallback long-polling sur forfait (souvent plus de données). */
export function preferWebsocketOnlyTransport(effectiveDataSaver: boolean, isOnCellular: boolean): boolean {
  return Platform.OS !== 'web' && (effectiveDataSaver || isOnCellular);
}

export function getInboxPollIntervalMs(effectiveDataSaver: boolean, isOnCellular: boolean): number {
  if (effectiveDataSaver || isOnCellular) return 300_000;
  return 120_000;
}

/** Pré-cache hors ligne auto (style TikTok) — fenêtre autour de la vidéo active. */
export function getOfflineAutoWarmAhead(effectiveDataSaver: boolean, isOnCellular: boolean): number {
  if (effectiveDataSaver || isOnCellular) return 5;
  return 8;
}

/** Nombre max de vidéos de la page courante mises en cache sans action utilisateur. */
export function getOfflineAutoWarmPageCap(effectiveDataSaver: boolean, isOnCellular: boolean): number {
  if (effectiveDataSaver || isOnCellular) return 16;
  return 24;
}

/** Évite le cache-bust `?_=timestamp` sur le 1er feed (inutile sur mobile, coûteux en Mo). */
export function shouldBustFeedCacheOnFirstPage(): boolean {
  return Platform.OS === 'web';
}

/**
 * Réglages liste feed : fluide d’abord (snap + index lecture), économie via URLs légères.
 */
export function getFeedScrollTuning(effectiveDataSaver: boolean, isOnCellular = false): FeedScrollTuning {
  if (Platform.OS === 'web') {
    return {
      windowSize: 5,
      maxToRenderPerBatch: 2,
      updateCellsBatchingPeriod: 80,
      scrollEventThrottle: 32,
      drawDistanceMultiplier: 2,
      onEndReachedThreshold: 0.4,
    };
  }
  if (effectiveDataSaver) {
    return {
      windowSize: 2,
      maxToRenderPerBatch: 1,
      updateCellsBatchingPeriod: 50,
      scrollEventThrottle: 16,
      drawDistanceMultiplier: 1,
      onEndReachedThreshold: 0.35,
    };
  }
  if (isOnCellular) {
    return {
      windowSize: 3,
      maxToRenderPerBatch: 1,
      updateCellsBatchingPeriod: 50,
      scrollEventThrottle: 16,
      drawDistanceMultiplier: 1.1,
      onEndReachedThreshold: 0.35,
    };
  }
  return {
    windowSize: 5,
    maxToRenderPerBatch: 2,
    updateCellsBatchingPeriod: 50,
    scrollEventThrottle: 16,
    drawDistanceMultiplier: Platform.OS === 'android' ? 1.5 : 2,
    onEndReachedThreshold: 0.45,
  };
}
