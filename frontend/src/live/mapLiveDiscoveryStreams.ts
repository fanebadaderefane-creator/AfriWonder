/** Mappe la réponse GET /live/discovery → cartes UI (hub, feed, Home). */
export type LiveDiscoveryCard = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  creatorName: string;
  creatorAvatar: string | null;
};

export function mapLiveDiscoveryStreams(raw: unknown): LiveDiscoveryCard[] {
  const box = raw as { streams?: unknown[] } | unknown[] | null;
  const list = Array.isArray(box)
    ? box
    : Array.isArray((box as { streams?: unknown[] })?.streams)
      ? (box as { streams: unknown[] }).streams
      : [];
  return list
    .map((row) => {
      const s = row as Record<string, unknown>;
      const creator = (s.creator ?? s.user ?? {}) as Record<string, unknown>;
      const id = String(s.id ?? s.stream_id ?? '').trim();
      if (!id) return null;
      return {
        id,
        title: String(s.title ?? 'Live'),
        thumbnailUrl: String(s.thumbnail_url ?? s.poster_url ?? creator.profile_image ?? '').trim() || null,
        viewerCount: Number(s.viewers_count ?? s.viewer_count ?? 0) || 0,
        creatorName: String(creator.full_name ?? creator.username ?? 'Créateur'),
        creatorAvatar: String(creator.profile_image ?? creator.avatar_url ?? '').trim() || null,
      };
    })
    .filter((x): x is LiveDiscoveryCard => x != null);
}
