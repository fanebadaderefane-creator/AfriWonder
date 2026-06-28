import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearAgoraPeerAcceptDedup,
  resetAgoraPeerAcceptDedupForTests,
  shouldHandleAgoraPeerAccept,
} from './agoraDmPeerAcceptDedup';

describe('agoraDmPeerAcceptDedup', () => {
  beforeEach(() => {
    resetAgoraPeerAcceptDedupForTests();
  });

  it('accepte une seule fois par callId', () => {
    expect(shouldHandleAgoraPeerAccept('c1')).toBe(true);
    expect(shouldHandleAgoraPeerAccept('c1')).toBe(false);
  });

  it('clear libère le callId', () => {
    expect(shouldHandleAgoraPeerAccept('c2')).toBe(true);
    clearAgoraPeerAcceptDedup('c2');
    expect(shouldHandleAgoraPeerAccept('c2')).toBe(true);
  });
});
