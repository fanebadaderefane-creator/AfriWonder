import {
  applyMeteredRegionalTurn,
  meteredTurnUrlsForHost,
  METERED_TURN_REGION_PRESETS,
  resolveMeteredTurnRelayHosts,
  rewriteMeteredTurnUrlList,
} from '../meteredTurnRegions.js';

describe('meteredTurnRegions', () => {
  it('preset afriwonder — AWS eu-west-1 + eu-central-1 + repli global (Maroc↔Mali)', () => {
    const { preset, hosts } = resolveMeteredTurnRelayHosts({ METERED_TURN_REGION: 'afriwonder' });
    expect(preset).toBe('afriwonder');
    expect(hosts).toEqual(METERED_TURN_REGION_PRESETS.afriwonder);
    expect(hosts[0]).toBe('eu-west-1.relay.metered.ca');
    expect(hosts).not.toContain('fr.relay.metered.ca');
    expect(hosts).not.toContain('eu-west.relay.metered.ca');
  });

  it('METERED_TURN_RELAY_HOSTS override', () => {
    const { preset, hosts } = resolveMeteredTurnRelayHosts({
      METERED_TURN_RELAY_HOSTS: 'eu-west-1.relay.metered.ca, eu-central-1.relay.metered.ca',
    });
    expect(preset).toBe('custom');
    expect(hosts).toEqual(['eu-west-1.relay.metered.ca', 'eu-central-1.relay.metered.ca']);
  });

  it('applyMeteredRegionalTurn remplace global par hôtes AWS afriwonder', () => {
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
    expect(urls.some((u) => u.includes('eu-west-1.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('eu-central-1.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('global.relay.metered.ca'))).toBe(true);
    expect(urls.some((u) => u.includes('global.relay.metered.ca:80'))).toBe(true);
  });

  it('rewriteMeteredTurnUrlList — expand to all regional hosts', () => {
    const out = rewriteMeteredTurnUrlList(
      ['turn:global.relay.metered.ca:443'],
      ['eu-west-1.relay.metered.ca', 'eu-central-1.relay.metered.ca'],
    );
    expect(out).toContain('turn:eu-west-1.relay.metered.ca:443');
    expect(out).toContain('turn:eu-central-1.relay.metered.ca:443');
  });

  it('rewriteMeteredTurnUrlList — réécrit chaque URL (régression regex /g + lastIndex)', () => {
    const input = [
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp',
      'turn:global.relay.metered.ca:80',
    ];
    const out = rewriteMeteredTurnUrlList(input, ['eu-west-1.relay.metered.ca']);
    expect(out).toHaveLength(3);
    expect(out.every((u) => u.includes('eu-west-1.relay.metered.ca'))).toBe(true);
    expect(out.some((u) => u.includes('global.relay.metered.ca'))).toBe(false);
  });

  it('meteredTurnUrlsForHost inclut UDP + TLS', () => {
    expect(meteredTurnUrlsForHost('eu-west-1.relay.metered.ca')).toEqual([
      'turn:eu-west-1.relay.metered.ca:80',
      'turn:eu-west-1.relay.metered.ca:80?transport=tcp',
      'turn:eu-west-1.relay.metered.ca:443',
      'turns:eu-west-1.relay.metered.ca:443?transport=tcp',
    ]);
  });
});
