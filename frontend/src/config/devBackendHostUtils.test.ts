import { describe, it, expect } from 'vitest';
import {
  isPrivateUseIpv4,
  parseHostFromDevConnectionString,
  orderedPrivateLanHostsFromStrings,
} from './devBackendHostUtils';

describe('devBackendHostUtils (régression Android / MEmu → API :3000)', () => {
  it('accepte les plages privées usuelles', () => {
    expect(isPrivateUseIpv4('10.0.2.2')).toBe(true);
    expect(isPrivateUseIpv4('192.168.1.11')).toBe(true);
    expect(isPrivateUseIpv4('172.20.0.1')).toBe(true);
    expect(isPrivateUseIpv4('169.254.1.1')).toBe(true);
    expect(isPrivateUseIpv4('127.0.0.1')).toBe(false);
    expect(isPrivateUseIpv4('8.8.8.8')).toBe(false);
  });

  it('extrait l’hôte depuis scriptURL Metro (bundle)', () => {
    expect(
      parseHostFromDevConnectionString(
        'http://192.168.1.11:8081/node_modules/expo-router/entry.bundle?platform=android'
      )
    ).toBe('192.168.1.11');
  });

  it('ignore localhost / 127.0.0.1 pour ne pas confondre avec l’émulateur', () => {
    expect(parseHostFromDevConnectionString('http://127.0.0.1:8081/')).toBe(null);
    expect(parseHostFromDevConnectionString('exp://127.0.0.1:8081')).toBe(null);
  });

  it('ordonne et déduplique : la première IP privée utile gagne (invariant MEmu)', () => {
    const hosts = orderedPrivateLanHostsFromStrings([
      'http://127.0.0.1:8081/',
      'http://192.168.44.2:8081/index.bundle',
      'http://192.168.44.2:8082/other',
      'exp://10.0.2.2:8081',
    ]);
    expect(hosts).toEqual(['192.168.44.2', '10.0.2.2']);
  });
});
