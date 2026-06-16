import { parseCallHistoryLimit } from '../callHistoryLimit.js';

describe('parseCallHistoryLimit', () => {
  it('défaut 20 si absent ou invalide', () => {
    expect(parseCallHistoryLimit(undefined)).toBe(20);
    expect(parseCallHistoryLimit('abc')).toBe(20);
    expect(parseCallHistoryLimit(0)).toBe(20);
  });

  it('plafonne à 50', () => {
    expect(parseCallHistoryLimit(100)).toBe(50);
    expect(parseCallHistoryLimit('30')).toBe(30);
  });
});
