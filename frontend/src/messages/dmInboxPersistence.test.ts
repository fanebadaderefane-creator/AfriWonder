import { describe, expect, it } from 'vitest';
import {
  mergeThreadMessageSources,
  pickThreadMessageSource,
  shouldApplyServerInboxList,
} from './dmInboxPersistence';

describe('dmInboxPersistence', () => {
  it('n’écrase pas l’inbox cache si le serveur renvoie 0 conversation', () => {
    expect(shouldApplyServerInboxList(0, 5)).toBe(false);
    expect(shouldApplyServerInboxList(3, 5)).toBe(true);
    expect(shouldApplyServerInboxList(0, 0)).toBe(true);
  });

  it('conserve le cache fil si API messages vide', () => {
    expect(pickThreadMessageSource([], [{ id: '1' }], [])).toEqual([{ id: '1' }]);
    expect(pickThreadMessageSource([{ id: 's' }], [{ id: 'c' }], [])).toEqual([{ id: 's' }]);
    expect(pickThreadMessageSource([], [], [{ id: 'ui' }])).toEqual([{ id: 'ui' }]);
  });

  it('mergeThreadMessageSources unionne serveur et cache sans perdre l’historique', () => {
    const server = [
      { id: 'new-1', createdAt: '2026-06-09T12:00:00.000Z', text: 'récent' },
      { id: 'new-2', createdAt: '2026-06-09T13:00:00.000Z', text: 'dernier' },
    ];
    const cache = [
      { id: 'old-1', createdAt: '2026-06-01T10:00:00.000Z', text: 'ancien cache' },
      { id: 'new-1', createdAt: '2026-06-09T12:00:00.000Z', text: 'récent cache' },
    ];
    const merged = mergeThreadMessageSources(server, cache, []);
    expect(merged.map((m) => m.id)).toEqual(['old-1', 'new-1', 'new-2']);
    expect(merged.find((m) => m.id === 'new-1')?.text).toBe('récent');
  });
});
