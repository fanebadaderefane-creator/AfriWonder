import { describe, expect, it } from 'vitest';
import { filterOutHiddenDmMessages } from './dmHiddenMessages';

describe('dmHiddenMessages', () => {
  it('filterOutHiddenDmMessages removes hidden ids', () => {
    const items = [
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
      { id: 'date-b', text: '' },
    ];
    const hidden = new Set(['b']);
    expect(filterOutHiddenDmMessages(items, hidden)).toEqual([
      { id: 'a', text: '1' },
      { id: 'date-b', text: '' },
    ]);
  });
});
