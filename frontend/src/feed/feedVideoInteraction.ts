export type FeedVideoInteractionFields = {
  isLiked?: boolean;
  isSaved?: boolean;
  myReaction?: string | null;
  views?: number;
  likes?: number;
  reactionCounts?: Record<string, number> | null;
  /** true quand le backend a renvoyé like/save utilisateur pour cette vidéo */
  viewerStateFromApi?: boolean;
};

export type FeedVideoStatesPayload = {
  likedIds?: string[];
  savedIds?: string[];
  reactionsByVideoId?: Record<string, string>;
};

export function parseFeedVideoStatesPayload(data: unknown): {
  likedIds: Set<string>;
  savedIds: Set<string>;
  reactionsByVideoId: Record<string, string>;
} {
  const raw = (data && typeof data === 'object' ? data : {}) as FeedVideoStatesPayload;
  return {
    likedIds: new Set((raw.likedIds || []).map(String)),
    savedIds: new Set((raw.savedIds || []).map(String)),
    reactionsByVideoId:
      raw.reactionsByVideoId && typeof raw.reactionsByVideoId === 'object'
        ? { ...raw.reactionsByVideoId }
        : {},
  };
}

/** Applique les états like/save serveur sur les vidéos visibles du feed. */
export function applyFeedVideoStates<T extends { id: string } & FeedVideoInteractionFields>(
  videos: T[],
  states: {
    likedIds: Set<string>;
    savedIds: Set<string>;
    reactionsByVideoId: Record<string, string>;
  },
  visibleIds?: Set<string>,
): T[] {
  if (videos.length === 0) return videos;
  const restrict = Boolean(visibleIds && visibleIds.size > 0);
  return videos.map((video) => {
    const id = String(video.id);
    if (restrict && !visibleIds!.has(id)) return video;
    const myReaction = states.reactionsByVideoId[id] ?? video.myReaction ?? null;
    const isLiked =
      states.likedIds.has(id) || myReaction === 'like' || Boolean(video.isLiked);
    const isSaved = states.savedIds.has(id) || Boolean(video.isSaved);
    return { ...video, myReaction, isLiked, isSaved, viewerStateFromApi: true };
  });
}

/** Fusionne l’état d’engagement local avec une réponse API fraîche (refresh / scroll retour). */
export function mergeFeedVideoInteraction<T extends { id: string } & FeedVideoInteractionFields>(
  fresh: T,
  prior?: T | null,
): T {
  if (!prior) return fresh;
  const apiSynced = fresh.viewerStateFromApi === true;
  const myReaction = apiSynced
    ? (fresh.myReaction ?? null)
    : (fresh.myReaction ?? prior.myReaction ?? null);
  const isLiked = apiSynced
    ? Boolean(fresh.isLiked ?? myReaction === 'like')
    : Boolean(prior.isLiked ?? fresh.isLiked ?? myReaction === 'like');
  const isSaved = apiSynced
    ? Boolean(fresh.isSaved)
    : Boolean(prior.isSaved ?? fresh.isSaved);
  const views = Math.max(Number(fresh.views) || 0, Number(prior.views) || 0);
  const likes = Math.max(Number(fresh.likes) || 0, Number(prior.likes) || 0);
  return {
    ...fresh,
    myReaction,
    isLiked,
    isSaved,
    views,
    likes,
    reactionCounts: fresh.reactionCounts ?? prior.reactionCounts ?? null,
    viewerStateFromApi: apiSynced || prior.viewerStateFromApi,
  };
}

export function pickFeedStateSyncIds(videoIds: string[], focusIndex: number, radius = 8): string[] {
  if (videoIds.length === 0) return [];
  const start = Math.max(0, focusIndex - radius);
  const end = Math.min(videoIds.length - 1, focusIndex + radius);
  const picked = new Set<string>();
  for (let i = start; i <= end; i += 1) {
    const id = String(videoIds[i] || '').trim();
    if (id) picked.add(id);
  }
  return [...picked].slice(0, 50);
}
