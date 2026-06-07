import { describe, expect, it } from 'vitest';
import {
  VIDEO_PROFILES,
  VOICE_OPUS_BITRATE_2G,
  VOICE_OPUS_BITRATE_3G,
  VOICE_OPUS_BITRATE_DEFAULT,
  buildCallIceConfig,
  callConnectionWatchdogMs,
  callMediaReadyHintMs,
  isCellularNetwork,
  isSlowCellularNetwork,
  outboundVideoDowngradeMessage,
  pickVideoProfileForNetwork,
  pickVoiceOpusBitrateForNetwork,
  resolveOutboundCallTypeForNetwork,
  shouldBlockCellularWithoutTurn,
  shouldForceTurnRelay,
  optimizeIceServersForNativeRelay,
  prepareIceServersForPlatform,
  resolveIceNetworkSnapshot,
  shouldBlockNativeCellularWithoutTlsTurn,
  sortTurnUrlsPreferTls,
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

describe('shouldForceTurnRelay — CGNAT Afrique', () => {
  it('TURN configuré → relais forcé sur cellulaire (natif + web), pas sur Wi‑Fi', () => {
    expect(
      shouldForceTurnRelay({
        turnConfigured: true,
        isWeb: false,
        net: { type: 'cellular', cellularGeneration: '3g' },
      }),
    ).toBe(true);
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: false, net: { type: 'wifi' } }),
    ).toBe(false);
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: true, net: { type: 'cellular' } }),
    ).toBe(true);
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: true, net: { type: 'wifi' } }),
    ).toBe(false);
  });
  it('sans TURN → pas de relais forcé', () => {
    expect(
      shouldForceTurnRelay({ turnConfigured: false, isWeb: false, net: { type: 'cellular' } }),
    ).toBe(false);
  });
});

describe('réseaux lents 2G/3G — vocal et délais', () => {
  it('isSlowCellularNetwork', () => {
    expect(isSlowCellularNetwork({ type: 'cellular', cellularGeneration: '2g' })).toBe(true);
    expect(isSlowCellularNetwork({ type: 'cellular', cellularGeneration: '3g' })).toBe(true);
    expect(isSlowCellularNetwork({ type: 'cellular', cellularGeneration: '4g' })).toBe(false);
    expect(isSlowCellularNetwork({ type: 'wifi' })).toBe(false);
  });
  it('pickVoiceOpusBitrateForNetwork', () => {
    expect(pickVoiceOpusBitrateForNetwork({ type: 'cellular', cellularGeneration: '2g' })).toBe(
      VOICE_OPUS_BITRATE_2G,
    );
    expect(pickVoiceOpusBitrateForNetwork({ type: 'cellular', cellularGeneration: '3g' })).toBe(
      VOICE_OPUS_BITRATE_3G,
    );
    expect(pickVoiceOpusBitrateForNetwork({ type: 'wifi' })).toBe(VOICE_OPUS_BITRATE_DEFAULT);
  });
  it('délais ICE plus longs sur 2G/3G', () => {
    expect(callConnectionWatchdogMs({ type: 'cellular', cellularGeneration: '2g' })).toBe(90_000);
    expect(callConnectionWatchdogMs({ type: 'cellular', cellularGeneration: '3g' })).toBe(75_000);
    expect(callConnectionWatchdogMs({ type: 'wifi' })).toBe(60_000);
    expect(callMediaReadyHintMs({ type: 'cellular', cellularGeneration: '2g' })).toBe(35_000);
    expect(callMediaReadyHintMs({ type: 'cellular', cellularGeneration: '3g' })).toBe(28_000);
  });
  it('resolveOutboundCallTypeForNetwork — 2G vidéo → vocal', () => {
    expect(
      resolveOutboundCallTypeForNetwork('video', { type: 'cellular', cellularGeneration: '2g' }),
    ).toEqual({ type: 'audio', downgradedFromVideo: true });
    expect(
      resolveOutboundCallTypeForNetwork('video', { type: 'cellular', cellularGeneration: '3g' }),
    ).toEqual({ type: 'video', downgradedFromVideo: false });
    expect(resolveOutboundCallTypeForNetwork('audio', { type: 'cellular', cellularGeneration: '2g' })).toEqual({
      type: 'audio',
      downgradedFromVideo: false,
    });
  });
  it('outboundVideoDowngradeMessage sur 2G uniquement', () => {
    expect(outboundVideoDowngradeMessage({ type: 'cellular', cellularGeneration: '2g' })).toContain('2G');
    expect(outboundVideoDowngradeMessage({ type: 'cellular', cellularGeneration: '3g' })).toBeNull();
  });
  it('shouldBlockCellularWithoutTurn — web et natif', () => {
    expect(
      shouldBlockCellularWithoutTurn({
        turnConfigured: false,
        net: { type: 'cellular', cellularGeneration: '3g' },
      }),
    ).toBe(true);
    expect(
      shouldBlockCellularWithoutTurn({ turnConfigured: true, net: { type: 'cellular' } }),
    ).toBe(false);
    expect(shouldBlockCellularWithoutTurn({ turnConfigured: false, net: { type: 'wifi' } })).toBe(false);
  });
});

describe('buildCallIceConfig', () => {
  it('TURN configuré → relay sur natif, ICE léger sur web', () => {
    const mobile = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: false,
      net: { type: 'cellular', cellularGeneration: '3g' },
    });
    expect(mobile.iceTransportPolicy).toBe('relay');

    const web = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: true,
      net: { type: 'wifi' },
    });
    expect(web.iceTransportPolicy).toBeUndefined();
    expect(web.iceCandidatePoolSize).toBe(4);
    expect(web.bundlePolicy).toBe('max-bundle');
    expect(web.rtcpMuxPolicy).toBe('require');
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

  it('Wi‑Fi + TURN natif → pas de relay forcé (parité web Wi‑Fi)', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: false,
      net: { type: 'wifi' },
    });
    expect(cfg.iceTransportPolicy).toBeUndefined();
  });

  it('web + TURN + cellulaire → relay forcé', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: true,
      net: { type: 'cellular', cellularGeneration: '3g' },
    });
    expect(cfg.iceTransportPolicy).toBe('relay');
  });

  it('web + TURN + Wi‑Fi → pas de relay forcé', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: true,
      net: { type: 'wifi' },
    });
    expect(cfg.iceTransportPolicy).toBeUndefined();
  });
});

describe('optimizeIceServersForNativeRelay', () => {
  it('préfère turns: et regroupe les URLs Metered', () => {
    const meteredLike: RTCIceServer[] = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80', username: 'u1', credential: 'c1' },
      { urls: 'turn:global.relay.metered.ca:443', username: 'u1', credential: 'c1' },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'u1', credential: 'c1' },
    ];
    const out = optimizeIceServersForNativeRelay(meteredLike);
    expect(out).toHaveLength(2);
    const turnEntry = out[1];
    const urls = Array.isArray(turnEntry.urls) ? turnEntry.urls : [turnEntry.urls];
    expect(urls[0]).toMatch(/^turns:/);
    expect(urls.length).toBeGreaterThanOrEqual(1);
    expect(turnEntry.username).toBe('u1');
    expect(turnEntry.credential).toBe('c1');
  });

  it('repli turn: si aucun turns: dans la réponse', () => {
    const plain: RTCIceServer[] = [
      { urls: 'turn:relay.example.com:3478', username: 'u', credential: 'c' },
    ];
    const out = optimizeIceServersForNativeRelay(plain);
    expect(out).toHaveLength(1);
    expect(out[0].urls).toBe('turn:relay.example.com:3478');
  });
});

describe('resolveIceNetworkSnapshot', () => {
  it('ne force pas cellulaire quand NetInfo échoue', () => {
    expect(resolveIceNetworkSnapshot(null)).toEqual({ type: 'unknown' });
    expect(resolveIceNetworkSnapshot({ type: 'none' })).toEqual({ type: 'unknown' });
    expect(resolveIceNetworkSnapshot({ type: 'wifi' })).toEqual({ type: 'wifi', cellularGeneration: null });
  });
});

describe('shouldBlockNativeCellularWithoutTlsTurn', () => {
  it('bloque cellulaire natif sans turns:', () => {
    expect(
      shouldBlockNativeCellularWithoutTlsTurn({
        isWeb: false,
        turnConfigured: true,
        net: { type: 'cellular', cellularGeneration: '4g' },
        iceServers: [{ urls: 'turn:relay.example.com:3478', username: 'u', credential: 'c' }],
      }),
    ).toBe(true);
    expect(
      shouldBlockNativeCellularWithoutTlsTurn({
        isWeb: false,
        turnConfigured: true,
        net: { type: 'cellular' },
        iceServers: [{ urls: 'turns:relay.example.com:443?transport=tcp', username: 'u', credential: 'c' }],
      }),
    ).toBe(false);
    expect(
      shouldBlockNativeCellularWithoutTlsTurn({
        isWeb: false,
        turnConfigured: true,
        net: { type: 'wifi' },
        iceServers: [{ urls: 'turn:relay.example.com:3478', username: 'u', credential: 'c' }],
      }),
    ).toBe(false);
  });
});

describe('sortTurnUrlsPreferTls', () => {
  it('classe turns: TCP en tête', () => {
    const sorted = sortTurnUrlsPreferTls([
      'turn:global.relay.metered.ca:80',
      'turns:global.relay.metered.ca:443?transport=tcp',
      'turn:global.relay.metered.ca:443',
    ]);
    expect(sorted[0]).toBe('turns:global.relay.metered.ca:443?transport=tcp');
  });
});
