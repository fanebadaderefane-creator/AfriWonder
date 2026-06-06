import { describe, expect, it } from 'vitest';
import { pickThreadMessageSource, shouldApplyServerInboxList } from './dmInboxPersistence';

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
});
