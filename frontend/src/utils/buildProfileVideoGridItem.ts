import { toAbsoluteMediaUrl } from './absoluteMediaUrl';
import { isVideoUrl } from '../components/SmartThumbnail';

/**
 * Visibilité exposée à la grille profil — accepte FR (legacy) et EN.
 *  - `public` : tout le monde
 *  - `private` (alias `prive`) : créateur uniquement
 *  - `followers` (alias `abonnes`) : abonnés uniquement
 *  - `archived` : brouillon archivé
 *  - `scheduled` : `scheduled_at` dans le futur (calculé localement)
 */
export type ProfileVisibility = 'public' | 'private' | 'followers' | 'archived' | 'scheduled';

/** Élément de grille profil / profil public / sauvegardes — URLs absolues + détection vidéo comme l’onglet Découvrir. */
export type ProfileGridPostItem = {
  id: string;
  image: string;
  posterUrl?: string;
  videoUrl?: string;
  fallbackImage?: string;
  isVideo: boolean;
  views: number;
  likes: number;
  isPinned: boolean;
  durationSec?: number | null;
  visibility: ProfileVisibility;
  /** ISO date (string) si la vidéo est programmée pour plus tard. */
  scheduledAt?: string | null;
};

function normalizeVisibility(raw: unknown, scheduledAt: Date | null): ProfileVisibility {
  if (scheduledAt && scheduledAt.getTime() > Date.now()) return 'scheduled';
  const v = String(raw || 'public').toLowerCase().trim();
  if (v === 'public') return 'public';
  if (v === 'prive' || v === 'private') return 'private';
  if (v === 'abonnes' || v === 'followers') return 'followers';
  if (v === 'archived' || v === 'archive' || v === 'brouillon') return 'archived';
  return 'public';
}

export function buildPostItemFromVideo(v: any, profileOwnerAvatar: string): ProfileGridPostItem {
  const absThumb = toAbsoluteMediaUrl(v.thumbnail_url || '').trim();
  const absLow = toAbsoluteMediaUrl(v.low_quality_url || v.low_quality_playback_url || '').trim();
  const absVid = toAbsoluteMediaUrl(v.video_url || '').trim();
  const absHls = toAbsoluteMediaUrl(v.hls_url || '').trim();

  const posterStatic =
    absThumb && !isVideoUrl(absThumb)
      ? absThumb
      : absLow && !isVideoUrl(absLow)
        ? absLow
        : '';

  const videoForFrame =
    absVid && isVideoUrl(absVid)
      ? absVid
      : absLow && isVideoUrl(absLow)
        ? absLow
        : absHls && isVideoUrl(absHls)
          ? absHls
          : '';

  const image = posterStatic || videoForFrame || absThumb || absLow || absVid || absHls;
  const creatorAvatar = toAbsoluteMediaUrl(v.creator_avatar || v.creator?.profile_image || '').trim();
  const isVideo = v.media_type === 'video' || Boolean(videoForFrame || absVid || absHls);
  const fallbackImage = isVideo ? undefined : creatorAvatar || profileOwnerAvatar;

  const dur = v.duration;
  const durationSec = typeof dur === 'number' && Number.isFinite(dur) ? dur : null;

  const scheduledRaw = v.scheduled_at ? new Date(v.scheduled_at) : null;
  const scheduledAt = scheduledRaw && !Number.isNaN(scheduledRaw.getTime()) ? scheduledRaw : null;
  const visibility = normalizeVisibility(v.visibility, scheduledAt);

  return {
    id: v.id,
    image,
    posterUrl: posterStatic,
    videoUrl: videoForFrame || absVid || absLow,
    fallbackImage,
    isVideo,
    views: v.views || 0,
    likes: v.likes || 0,
    isPinned: v.is_featured || false,
    durationSec,
    visibility,
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
  };
}
