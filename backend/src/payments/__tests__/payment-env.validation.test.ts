import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validateMobileMoneyConfig } from '../payment-env.validation.js';

describe('payment-env.validation', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = { ...prev };
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('production: erreurs si mock Orange', () => {
    process.env.NODE_ENV = 'production';
    process.env.ORANGE_MONEY_MOCK = 'true';
    process.env.ORANGE_MONEY_MERCHANT_ID = 'm';
    process.env.ORANGE_MONEY_API_KEY = 'k';
    process.env.WAVE_API_KEY = 'w';
    const v = validateMobileMoneyConfig();
    expect(v.readyForProduction).toBe(false);
    expect(v.errors.some((e) => e.includes('MOCK'))).toBe(true);
  });

  it('développement: pas d’erreur bloquante', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ORANGE_MONEY_MERCHANT_ID;
    const v = validateMobileMoneyConfig();
    expect(v.readyForDevelopment).toBe(true);
    expect(v.errors.length).toBe(0);
  });
});
