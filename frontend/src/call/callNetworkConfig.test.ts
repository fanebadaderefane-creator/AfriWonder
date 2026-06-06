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
  it('TURN configuré → relais forcé sur natif et web cellulaire', () => {
    expect(
      shouldForceTurnRelay({
        turnConfigured: true,
        isWeb: false,
        net: { type: 'cellular', cellularGeneration: '3g' },
      }),
    ).toBe(true);
    expect(
      shouldForceTurnRelay({ turnConfigured: true, isWeb: false, net: { type: 'wifi' } }),
    ).toBe(true);
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

  it('Wi‑Fi + TURN → relay forcé aussi', () => {
    const cfg = buildCallIceConfig({
      iceServers: TURN,
      turnConfigured: true,
      isWeb: false,
      net: { type: 'wifi' },
    });
    expect(cfg.iceTransportPolicy).toBe('relay');
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
