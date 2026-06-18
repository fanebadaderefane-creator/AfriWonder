import { describe, expect, it } from 'vitest';
import { shouldUseAgoraDmCalls } from './dmCallMediaEngine';

describe('shouldUseAgoraDmCalls', () => {
  it('exporte une fonction booléenne', () => {
    expect(typeof shouldUseAgoraDmCalls()).toBe('boolean');
  });
});
