import { cacheDelete, cacheDeleteByPrefix } from '../utils/cache.js';

const FEED_PREFS_PREFIX = 'feed:prefs:v2:';
const FEED_RESPONSE_PREFIX = 'feed::u:';

export async function invalidateUserFeedCaches(userId: string): Promise<void> {
  if (!userId) return;

  await Promise.all([
    cacheDelete(`${FEED_PREFS_PREFIX}${userId}`),
    cacheDeleteByPrefix(`${FEED_RESPONSE_PREFIX}${userId}:`),
  ]);
}
