import { cacheDelete, cacheDeleteByPrefix } from '../utils/cache.js';

const FEED_PREFS_PREFIX = 'feed:prefs:v3:';
const FEED_RESPONSE_PREFIX = 'feed::u:';

export async function invalidateUserFeedCaches(userId: string): Promise<void> {
  if (!userId) return;

  await Promise.all([
    cacheDelete(`${FEED_PREFS_PREFIX}${userId}`),
    cacheDeleteByPrefix(`${FEED_RESPONSE_PREFIX}${userId}:`),
  ]);
}

/**
 * Invalide les réponses GET `/feed` en cache pour tous les utilisateurs et invités
 * (clés `responseCache('feed:', …)` : `feed::u:…`, `feed::t:…`, `feed:/api/…`).
 * À appeler après une nouvelle publication pour que le Home reflète le contenu.
 */
export async function invalidateAllFeedResponseCaches(): Promise<void> {
  await Promise.all([
    cacheDeleteByPrefix(FEED_RESPONSE_PREFIX),
    cacheDeleteByPrefix('feed::t:'),
    cacheDeleteByPrefix('feed:/api/'),
  ]);
}
