import { describe, expect, it } from 'vitest';
import {
  VIDEO_PROFILES,
  buildCallIceConfig,
  isCellularNetwork,
  pickVideoProfileForNetwork,
  shouldForceTurnRelay,
} from './callNetworkConfig';

const STUN: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const TURN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:turn.afriwonder.com:3478', username: 'u', credential: 'c' },
];

describe('isCellularNetwork', () => {
  it('détecte le cellulaire', () => {
    expect(isCellularNetwork({ type: 'cellular' })).toBe(true);
    expect(isCellularNetwork({ type: 'CELLULAR' })).toBe(true);
  });
  it('non cellulaire pour wifi / none / null', () => {
    expect(isCellularNetwork({ type: 'wifi' })).toBe(false);
    expect(isCellularNetwork({ type: 'none' })).toBe(false);
    expect(isCellularNetwork(null)).toBe(false);
    expect(isCellularNetwork(undefined)).toBe(false);
  });
});

describe('pickVideoProfileForNetwork — Afrique 2G/3G/4G', () => {
  it('2G → basse qualité', () => {
    expect(pickVideoProfileForNetwork({ type: 'cellular', cellularGeneration: '2g' })).toBe(
      VIDEO_PROFILES.low,
    );
  });
  it('3G → basse qualité', () => {
    expect(pickVideoProfileForNetwork({ type: 'cellular', cellularGeneration: '3g' })).toBe(
      VIDEO_PROFILES.low,
    );
  });
  it('4G → qualité moyenne', () => {
    expect(pickVideoProfileForNetwork({ type: 'cellular', cellularGeneration: '4g' })).toBe(
      VIDEO_PROFILES.medium,
    );
  });
  it('5G → HD', () => {
    expect(pickVideoProfileForNetwork({ type: 'cellular', cellularGeneration: '5g' })).toBe(
      VIDEO_PROFILES.high,
    );
  });
  it('Wi‑Fi / Ethernet → HD', () => {
    expect(pickVideoProfileForNetwork({ type: 'wifi' })).toBe(VIDEO_PROFILES.high);
    expect(pickVideoProfileForNetwork({ type: 'ethernet' })).toBe(VIDEO_PROFILES.high);
  });
  it('cellulaire génération inconnue → moyenne (prudent)', () => {
    expect(pickVideoProfileForNetwork({ type: 'cellular', cellularGeneration: null })).toBe(
      VIDEO_PROFILES.medium,
    );
  });
  it('réseau inconnu → moyenne', () => {
    expect(pickVideoProfileForNetwork(null)).toBe(VIDEO_PROFILES.medium);
  });
  it('plafonds de débit cohérents 2G/3G < 4G < HD', () => {
    expect(VIDEO_PROFILES.low.maxBitrate).toBeLessThan(VIDEO_PROFILES.medium.maxBitrate);
    expect(VIDEO_PROFILES.medium.maxBitrate).toBeLessThan(VIDEO_PROFILES.high.maxBitrate);
  });
});

describe('shouldForceTurnRelay — CGNAT mobile Afrique', () => {
  it('cellulaire (2G/3G/4G) + TURN → force le relais', () => {
    for (const gen of ['2g', '3g', '4g']) {
      expect(
        shouldForceTurnRelay({
          turnConfigured: true,
          isWeb: false,
          net: { type: 'cellular', cellularGeneration: gen },
        }),
      ).toBe(true);
    }
  });
  it('cellulaire SANS TURN → ne force pas (aucun relais disponible)', () => {
    expect(
      shouldForceTurnRelay({ turnConfigured: false, isWeb: false, net: { type: 'cellular' } }),
    ).toBe(false);
  });
  it('Wi‑Fi + TURN → ne force pas (direct fonctionne)', () => {
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: false, net: { type: 'wifi' } }),
    ).toBe(false);
  });
  it('web → jamais de relais forcé', () => {
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: true, net: { type: 'cellular' } }),
    ).toBe(false);
  });
});

describe('buildCallIceConfig', () => {
  it('cellulaire + TURN → iceTransportPolicy relay + serveurs TURN', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: false,
      net: { type: 'cellular', cellularGeneration: '3g' },
    });
    expect(cfg.iceTransportPolicy).toBe('relay');
    expect(cfg.iceServers).toBe(TURN);
    expect(cfg.bundlePolicy).toBe('max-bundle');
    expect(cfg.rtcpMuxPolicy).toBe('require');
  });

  it('cellulaire SANS TURN → pas de relay forcé (STUN seul, tente tout)', () => {
    const cfg = buildCallIceConfig({
      iceServers: STUN,
      turnConfigured: false,
      isWeb: false,
      net: { type: 'cellular', cellularGeneration: '2g' },
    });
    expect(cfg.iceTransportPolicy).toBeUndefined();
  });

  it('Wi‑Fi + TURN → pas de relay forcé (TURN reste candidat de secours)', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: false,
      net: { type: 'wifi' },
    });
    expect(cfg.iceTransportPolicy).toBeUndefined();
  });

  it('web → jamais de relay forcé', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: true,
      net: { type: 'cellular' },
    });
    expect(cfg.iceTransportPolicy).toBeUndefined();
  });
});
