/** Tri type TikTok : vidéos épinglées (`is_featured`) en tête, puis le reste. */

export type ProfileVideoSortMode = 'recent' | 'popular' | 'oldest';

function createdTs(v: any): number {
  const d = v?.created_at ?? v?.createdAt;
  const x = d ? new Date(d).getTime() : 0;
  return Number.isFinite(x) ? x : 0;
}

function updatedTs(v: any): number {
  const d = v?.updated_at ?? v?.updatedAt;
  const x = d ? new Date(d).getTime() : 0;
  return Number.isFinite(x) ? x : 0;
}

/** Tri brut sans tenir compte des épingles (onglet profil public avec filtres). */
export function sortVideosRaw(list: any[], mode: ProfileVideoSortMode): any[] {
  const arr = [...list];
  if (mode === 'popular') {
    arr.sort((a, b) => (Number(b?.views) || 0) - (Number(a?.views) || 0));
  } else if (mode === 'oldest') {
    arr.sort((a, b) => createdTs(a) - createdTs(b));
  } else {
    arr.sort((a, b) => createdTs(b) - createdTs(a));
  }
  return arr;
}

/**
 * Épinglés d’abord (ordre : `updated_at` desc parmi les épinglés), puis le reste selon le mode.
 */
export function sortVideosWithPinnedFirst(list: any[], mode: ProfileVideoSortMode): any[] {
  const pinned = list.filter((v) => v?.is_featured);
  const rest = list.filter((v) => !v?.is_featured);
  pinned.sort((a, b) => updatedTs(b) - updatedTs(a));
  return [...pinned, ...sortVideosRaw(rest, mode)];
}

/** Profil perso (pas de sous-tri) : épinglés puis publications par date décroissante. */
export function orderRawVideosPinnedFirstForProfile(videos: any[]): any[] {
  const pinned = videos.filter((v) => v?.is_featured);
  const rest = videos.filter((v) => !v?.is_featured);
  pinned.sort((a, b) => updatedTs(b) - updatedTs(a));
  rest.sort((a, b) => createdTs(b) - createdTs(a));
  return [...pinned, ...rest];
}
