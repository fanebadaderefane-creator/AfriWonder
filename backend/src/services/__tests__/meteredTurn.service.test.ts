import {
  applyConfiguredMeteredRegion,
  buildMeteredCredentialsApiUrl,
  buildStaticIceServers,
  clearMeteredTurnCache,
  normalizeMeteredIceServers,
  resolveMeteredStaticTurnUrls,
  turnPayloadFromIceServers,
} from '../meteredTurn.service.js';

describe('meteredTurn.service', () => {
  afterEach(() => {
    clearMeteredTurnCache();
  });

  it('buildMeteredCredentialsApiUrl encode domain and apiKey', () => {
    const url = buildMeteredCredentialsApiUrl('afriwonder.metered.live', 'abc+key');
    expect(url).toBe('https://afriwonder.metered.live/api/v1/turn/credentials?apiKey=abc%2Bkey');
  });

  it('normalizeMeteredIceServers accepte le format dashboard Metered', () => {
    const raw = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'user1',
        credential: 'pass1',
      },
    ];
    const out = normalizeMeteredIceServers(raw);
    expect(out).toHaveLength(2);
    expect(out?.[1]?.username).toBe('user1');
  });

  it('turnPayloadFromIceServers expose iceServers + champs legacy', () => {
    const payload = turnPayloadFromIceServers([
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: ['turn:global.relay.metered.ca:80', 'turns:global.relay.metered.ca:443?transport=tcp'],
        username: '707ac69357e7083ddec37d19',
        credential: 'secret',
      },
    ]);
    expect(payload.turnConfigured).toBe(true);
    expect(payload.urls).toHaveLength(2);
    expect(payload.username).toBe('707ac69357e7083ddec37d19');
    expect(payload.iceServers).toHaveLength(2);
  });

  it('buildStaticIceServers inclut STUN Metered + TURN régional (défaut afriwonder)', () => {
    const servers = buildStaticIceServers(
      ['turn:global.relay.metered.ca:443'],
      'user',
      'pass',
    );
    expect(servers.some((s) => String(s.urls).includes('stun.relay.metered.ca'))).toBe(true);
    const turnUrls = servers.flatMap((s) =>
      Array.isArray(s.urls) ? s.urls.map(String) : [String(s.urls)],
    );
    expect(turnUrls.some((u) => u.includes('fr.relay.metered.ca'))).toBe(true);
  });

  it('applyConfiguredMeteredRegion expose turnRegion dans le payload', () => {
    const { iceServers, region } = applyConfiguredMeteredRegion([
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'u',
        credential: 'p',
      },
    ]);
    expect(region.preset).toBe('afriwonder');
    const payload = turnPayloadFromIceServers(iceServers, {
      turnRegion: region.preset,
      turnRelayHosts: [...region.hosts],
    });
    expect(payload.turnRegion).toBe('afriwonder');
    expect(payload.turnRelayHosts).toContain('fr.relay.metered.ca');
  });

  it('resolveMeteredStaticTurnUrls — plus de global Canada seul par défaut', () => {
    const urls = resolveMeteredStaticTurnUrls();
    expect(urls.some((u) => u.includes('fr.relay.metered.ca'))).toBe(true);
  });
});
