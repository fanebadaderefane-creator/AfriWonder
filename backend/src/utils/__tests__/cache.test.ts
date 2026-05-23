import { beforeEach, describe, expect, it } from '@jest/globals';

describe('cache utils', () => {
  beforeEach(async () => {
    const cache = await import('../cache.js');
    cache.resetCacheForTests();
  });

  it('supprime une clé précise du cache mémoire', async () => {
    const { cacheGet, cacheSet, cacheDelete } = await import('../cache.js');

    await cacheSet('feed:prefs:v2:user-1', { ok: true }, 5_000);
    expect(await cacheGet('feed:prefs:v2:user-1')).toEqual({ ok: true });

    await cacheDelete('feed:prefs:v2:user-1');
    expect(await cacheGet('feed:prefs:v2:user-1')).toBeNull();
  });

  it('supprime les clés par préfixe sans toucher aux autres', async () => {
    const { cacheGet, cacheSet, cacheDeleteByPrefix } = await import('../cache.js');

    await cacheSet('feed::u:user-1:/api/feed?page=1', { page: 1 }, 5_000);
    await cacheSet('feed::u:user-1:/api/feed?page=2', { page: 2 }, 5_000);
    await cacheSet('feed::u:user-2:/api/feed?page=1', { page: 1 }, 5_000);

    await cacheDeleteByPrefix('feed::u:user-1:');

    expect(await cacheGet('feed::u:user-1:/api/feed?page=1')).toBeNull();
    expect(await cacheGet('feed::u:user-1:/api/feed?page=2')).toBeNull();
    expect(await cacheGet('feed::u:user-2:/api/feed?page=1')).toEqual({ page: 1 });
  });
});
