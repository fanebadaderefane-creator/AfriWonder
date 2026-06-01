import { toAbsoluteMediaUrl } from './absoluteMediaUrl';

/** URL lisible hors-ligne (MP4 / fichier local — pas HLS/DASH). */
export function isProgressiveVideoUrl(url: string): boolean {
  const path = url.trim().toLowerCase().split('?')[0].split('#')[0];
  if (!path) return false;
  if (path.includes('.m3u8') || path.includes('.mpd')) return false;
  if (path.startsWith('file://') || path.startsWith('content://')) return true;
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(`${path}?`);
}

/**
 * Choisit une URL progressive pour cache hors-ligne (toujours bas débit en priorité).
 */
export function pickProgressivePlaybackUrl(
  v: Record<string, unknown>,
  preferLow = true,
): string {
  const fields = preferLow
    ? [v.low_quality_playback_url, v.low_quality_url, v.video_url, v.videoUrl]
    : [v.video_url, v.videoUrl, v.low_quality_playback_url, v.low_quality_url];
  for (const f of fields) {
    const u = toAbsoluteMediaUrl(String(f || '').trim()).trim();
    if (u && isProgressiveVideoUrl(u)) return u;
  }
  return '';
}
