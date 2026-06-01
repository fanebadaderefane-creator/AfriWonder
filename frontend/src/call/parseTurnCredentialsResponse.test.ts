import { describe, expect, it } from 'vitest';
import { parseTurnCredentialsResponse } from './parseTurnCredentialsResponse';

describe('parseTurnCredentialsResponse', () => {
  it('utilise iceServers complet quand fourni (Metered API)', () => {
    const parsed = parseTurnCredentialsResponse({
      turnConfigured: true,
      iceServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: 'u',
          credential: 'c',
        },
      ],
    });
    expect(parsed.turnConfigured).toBe(true);
    expect(parsed.iceServers).toHaveLength(2);
  });

  it('repli legacy urls + username + credential', () => {
    const parsed = parseTurnCredentialsResponse({
      turnConfigured: true,
      urls: ['turn:global.relay.metered.ca:80', 'turns:global.relay.metered.ca:443?transport=tcp'],
      username: 'u',
      credential: 'c',
      publicStun: ['stun:stun.l.google.com:19302'],
    });
    expect(parsed.turnConfigured).toBe(true);
    expect(parsed.iceServers.length).toBeGreaterThan(1);
  });

  it('STUN seuls si turn non configuré', () => {
    const parsed = parseTurnCredentialsResponse({ turnConfigured: false });
    expect(parsed.turnConfigured).toBe(false);
    expect(parsed.iceServers.length).toBeGreaterThan(0);
  });
});
