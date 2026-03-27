import { getVideoPlaybackUrl } from '../api/client';
import { getAbsoluteImageUrl } from './index';

const VIDEO_EXT = /\.(mp4|webm|mov|m3u8|m4v|avi|mkv)(\?|$)/i;

/** Même idée que PWA isValidThumbnailUrl : une URL miniature qui pointe vers une vidéo n’est pas affichable avec <Image />. */
export function isValidImageThumbnailUrl(thumbnailUrl, videoUrl) {
  if (!thumbnailUrl || typeof thumbnailUrl !== 'string') return false;
  const v = videoUrl && typeof videoUrl === 'string' ? videoUrl : '';
  if (v && thumbnailUrl === v) return false;
  if (VIDEO_EXT.test(thumbnailUrl)) return false;
  return true;
}

/** URL de lecture pour l’aperçu grille (proxy mobile, HLS prioritaire). */
export function getVideoGridPlaybackUrl(video) {
  const raw =
    video?.hls_url ||
    video?.video_url ||
    video?.videoUrl ||
    video?.low_quality_url ||
    video?.lowQualityUrl ||
    video?.hd_url ||
    video?.url ||
    '';
  if (!raw || typeof raw !== 'string') return '';
  return getVideoPlaybackUrl(raw);
}

export function getGridThumbnailImageUri(video) {
  const thumbRaw = video?.thumbnail_url || video?.thumbnailUrl || '';
  const videoRaw = video?.video_url || video?.videoUrl || '';
  if (!isValidImageThumbnailUrl(thumbRaw, videoRaw)) return '';
  return getAbsoluteImageUrl(thumbRaw);
}
