import { describe, expect, it } from 'vitest';
import { capFeedVideosForMemory, trimIdSet, trimRecordKeys } from './feedMemoryCap';

describe('capFeedVideosForMemory', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: `v${i}` }));

  it('ne modifie pas une liste courte', () => {
    const short = items.slice(0, 10);
    const r = capFeedVideosForMemory(short, 3, 48);
    expect(r.list).toHaveLength(10);
    expect(r.anchorIndex).toBe(3);
  });

  it('tronque autour de l’index actif', () => {
    const r = capFeedVideosForMemory(items, 60, 48);
    expect(r.list).toHaveLength(48);
    expect(r.list[r.anchorIndex]?.id).toBe('v60');
  });
});

describe('trimIdSet', () => {
  it('garde les ids prioritaires', () => {
    const s = new Set(['a', 'b', 'c', 'd']);
    trimIdSet(s, 2, ['c', 'd']);
    expect(s.has('c')).toBe(true);
    expect(s.has('d')).toBe(true);
    expect(s.size).toBeLessThanOrEqual(2);
  });
});

describe('trimRecordKeys', () => {
  it('limite les clés en gardant les prioritaires', () => {
    const r = trimRecordKeys({ a: 1, b: 2, c: 3 }, 2, ['c']);
    expect(r.c).toBe(3);
    expect(Object.keys(r).length).toBeLessThanOrEqual(2);
  });
});
