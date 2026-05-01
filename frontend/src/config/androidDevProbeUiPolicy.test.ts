import { describe, it, expect } from 'vitest';
import { shouldHoldUiForAndroidDevBackendProbe } from './androidDevProbeUiPolicy';

describe('androidDevProbeUiPolicy', () => {
  it('ne bloque pas hors Android dev', () => {
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'ios',
        isDev: true,
        hasExplicitBackendOrigin: false,
      })
    ).toBe(false);
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: false,
        hasExplicitBackendOrigin: false,
      })
    ).toBe(false);
  });

  it('bloque uniquement Android dev sans URL explicite', () => {
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: true,
        hasExplicitBackendOrigin: false,
      })
    ).toBe(true);
    expect(
      shouldHoldUiForAndroidDevBackendProbe({
        platformOs: 'android',
        isDev: true,
        hasExplicitBackendOrigin: true,
      })
    ).toBe(false);
  });
});
