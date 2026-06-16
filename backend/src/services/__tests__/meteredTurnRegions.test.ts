import {
  applyMeteredRegionalTurn,
  meteredTurnUrlsForHost,
  METERED_TURN_REGION_PRESETS,
  resolveMeteredTurnRelayHosts,
  rewriteMeteredTurnUrlList,
} from '../meteredTurnRegions.js';

describe('meteredTurnRegions', () => {
  it('preset afriwonder — France + EU-Ouest + repli global (Maroc↔Mali)', () => {
    const { preset, hosts } = resolveMeteredTurnRelayHosts({ METERED_TURN_REGION: 'afriwonder' });
    expect(preset).toBe('afriwonder');
    expect(hosts).toEqual(METERED_TURN_REGION_PRESETS.afriwonder);
    expect(hosts[0]).toBe('fr.relay.metered.ca');
  });

  it('METERED_TURN_RELAY_HOSTS override', () => {
    const { preset, hosts } = resolveMeteredTurnRelayHosts({
      METERED_TURN_RELAY_HOSTS: 'fr.relay.metered.ca, eu-west.relay.metered.ca',
    });
    expect(preset).toBe('custom');
    expect(hosts).toEqual(['fr.relay.metered.ca', 'eu-west.relay.metered.ca']);
  });

  it('applyMeteredRegionalTurn remplace global par fr/eu-west', () => {
    const out = applyMeteredRegionalTurn(
      [
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: ['turn:global.relay.metered.ca:80', 'turns:global.relay.metered.ca:443?transport=tcp'],
          username: 'user',
          credential: 'pass',
        },
      ],
      METERED_TURN_REGION_PRESETS.afriwonder,
    );
    const turn = out.find((e) => String(e.urls).includes('turn:'));
    expect(turn?.username).toBe('user');
    const urls = Array.isArray(turn?.urls) ? turn.urls.map(String) : [String(turn?.urls)];
    expect(urls.some((u) => u.includes('fr.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('eu-west.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('global.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('global.relay.metered.ca:80'))).toBe(true);
  });

  it('rewriteMeteredTurnUrlList', () => {
    const out = rewriteMeteredTurnUrlList(
      ['turn:global.relay.metered.ca:443'],
      ['fr.relay.metered.ca'],
    );
    expect(out[0]).toBe('turn:fr.relay.metered.ca:443');
  });

  it('meteredTurnUrlsForHost inclut UDP + TLS', () => {
    expect(meteredTurnUrlsForHost('fr.relay.metered.ca')).toEqual([
      'turn:fr.relay.metered.ca:80',
      'turn:fr.relay.metered.ca:80?transport=tcp',
      'turn:fr.relay.metered.ca:443',
      'turns:fr.relay.metered.ca:443?transport=tcp',
    ]);
  });
});
