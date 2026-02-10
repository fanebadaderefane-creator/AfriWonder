/**
 * Tests unitaires pour config/region.ts
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('config/region', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('getAppCountry retourne le pays par défaut sans APP_COUNTRY', async () => {
    delete process.env.APP_COUNTRY;
    const { getAppCountry, DEFAULT_COUNTRY } = await import('../region.js');
    expect(getAppCountry()).toBe(DEFAULT_COUNTRY);
  });

  it('getAppCountry retourne un pays supporté quand APP_COUNTRY est valide', async () => {
    process.env.APP_COUNTRY = 'sn';
    const { getAppCountry } = await import('../region.js');
    expect(getAppCountry()).toBe('SN');
  });

  it('getAppCountry fallback sur DEFAULT_COUNTRY quand APP_COUNTRY invalide', async () => {
    process.env.APP_COUNTRY = 'FR';
    const { getAppCountry, DEFAULT_COUNTRY } = await import('../region.js');
    expect(getAppCountry()).toBe(DEFAULT_COUNTRY);
  });

  it('isSupportedCountry détecte correctement les pays supportés', async () => {
    const { isSupportedCountry } = await import('../region.js');
    expect(isSupportedCountry('ML')).toBe(true);
    expect(isSupportedCountry('ml')).toBe(true);
    expect(isSupportedCountry('FR')).toBe(false);
  });
});

