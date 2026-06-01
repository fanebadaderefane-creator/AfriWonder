import { describe, expect, it } from 'vitest';
import { pickCacheEntriesForEviction } from './feedOfflineCacheEviction';

describe('pickCacheEntriesForEviction', () => {
  const base = (id: string, size: number, watched: boolean, cachedAt: number) => ({
    videoId: id,
    localPath: `/cache/${id}.mp4`,
    remoteUrl: `https://cdn.example/${id}.mp4`,
    fileSize: size,
    cachedAt,
    watched,
  });

  it('purge d’abord les entrées non regardées', () => {
    const entries = [
      base('w1', 1_000_000, true, 100),
      base('u1', 1_000_000, false, 50),
      base('u2', 1_000_000, false, 60),
    ];
    const removed = pickCacheEntriesForEviction(entries, 2, 10_000_000);
    expect(removed.map((e) => e.videoId)).toEqual(['u1']);
  });

  it('ne purge les regardées que si le budget l’exige encore', () => {
    const entries = [
      base('w1', 5_000_000, true, 100),
      base('u1', 5_000_000, false, 50),
    ];
    const removed = pickCacheEntriesForEviction(entries, 1, 6_000_000);
    expect(removed.map((e) => e.videoId)).toEqual(['u1']);
  });
});
