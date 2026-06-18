import { describe, expect, it } from 'vitest';
import { formatIncomingCallerSubtitle } from './incomingCallDisplay';

describe('formatIncomingCallerSubtitle', () => {
  it('affiche le téléphone quand présent', () => {
    expect(formatIncomingCallerSubtitle({ callerPhone: '+212 621-225680' })).toBe('+212 621-225680');
  });

  it('repli AfriWonder sans numéro', () => {
    expect(formatIncomingCallerSubtitle({})).toBe('AfriWonder');
  });
});
