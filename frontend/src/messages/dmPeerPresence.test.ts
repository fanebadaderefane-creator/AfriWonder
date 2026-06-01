import { describe, expect, it } from 'vitest';
import { formatPeerPresenceLabel } from './dmPeerPresence';

describe('formatPeerPresenceLabel', () => {
  it('prioritizes typing then online', () => {
    expect(formatPeerPresenceLabel({ isTyping: true, isOnline: true, lastSeen: null })).toBe(
      "En train d'écrire...",
    );
    expect(formatPeerPresenceLabel({ isTyping: false, isOnline: true, lastSeen: null })).toBe('En ligne');
  });

  it('shows offline when no presence data', () => {
    expect(formatPeerPresenceLabel({ isTyping: false, isOnline: false, lastSeen: null })).toBe('Hors ligne');
  });
});
