import { describe, it, expect } from 'vitest';
import { shouldHoldUiForAndroidDevBackendProbe } from './androidDevProbeUiPolicy';

describe('androidDevProbeUiPolicy', () => {
  it('ne bloque pas hors Android dev', () => {
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'ios',
        isDev: true,
        needsLanBackendProbe: true,
      })
    ).toBe(false);
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: false,
        needsLanBackendProbe: true,
      })
    ).toBe(false);
  });

  it('bloque Android dev quand le probe LAN est nécessaire (pas d’URL ou URL locale / LAN)', () => {
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: true,
        needsLanBackendProbe: true,
      })
    ).toBe(true);
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: true,
        needsLanBackendProbe: false,
      })
    ).toBe(false);
  });
});
