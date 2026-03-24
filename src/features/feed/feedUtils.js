import {
  VIDEO_PLACEHOLDER_IMG,
  getAbsoluteImageUrl,
  getVideoPlaybackUrl,
  isValidThumbnailUrl,
} from '@/lib/utils';

export function extractMainFeedVideoItems(feedItems, { userHydrated = false, log = false } = {}) {
  const seen = new Set();
  const out = [];

  for (const item of feedItems || []) {
    let video = null;

    if (item?.video && item.video.id != null) {
      video = item.video;
    } else if (
      item &&
      item.id != null &&
      item.type !== 'ad' &&
      item.type !== 'top_banner' &&
      (item.video_url || item.playback_url || item.hls_playback_url || item.hls_url)
    ) {
      video = item;
    }

    if (!video) {
      if (log && item?.type !== 'ad' && item?.type !== 'top_banner') {
        console.warn('[Feed] item ignoré (pas de vidéo extraite):', item);
      }
      continue;
    }

    const key = String(video.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: 'video', video });
  }

  if (log && userHydrated) {
    console.log(`[Feed] ${feedItems.length} items bruts → ${out.length} vidéos`);
    if (feedItems.length > 0 && out.length === 0) {
      console.warn('[Feed] ⚠ Aucune vidéo extraite ! Premier item:', feedItems[0]);
    }
  }

  return out;
}

export function normalizeFeedVideo(video) {
  if (!video) return null;

  return {
    ...video,
    playback_url: getVideoPlaybackUrl(video.playback_url || video.video_url),
    hls_playback_url: getVideoPlaybackUrl(video.hls_playback_url || video.hls_url),
    hd_playback_url: getVideoPlaybackUrl(video.hd_playback_url || video.hd_url),
    low_quality_playback_url: getVideoPlaybackUrl(video.low_quality_playback_url || video.low_quality_url),
  };
}

export function getFeedPosterUrl(video) {
  if (!video) return VIDEO_PLACEHOLDER_IMG;
  return isValidThumbnailUrl(video.thumbnail_url, video.video_url)
    ? video.thumbnail_url
    : VIDEO_PLACEHOLDER_IMG;
}

export function getFeedSlideBackgroundUrl(video) {
  const posterUrl = getFeedPosterUrl(video);
  if (!posterUrl) return VIDEO_PLACEHOLDER_IMG;
  if (posterUrl.startsWith('data:')) return posterUrl;
  return getAbsoluteImageUrl(posterUrl) || posterUrl;
}

export function formatFeedCount(value) {
  const safeValue = Number(value) || 0;

  if (safeValue >= 1000000) {
    return `${(safeValue / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return safeValue.toLocaleString();
}

export function getCreatorInitial(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
}
