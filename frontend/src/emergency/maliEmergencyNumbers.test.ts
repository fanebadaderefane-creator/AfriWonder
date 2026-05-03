import { describe, it, expect } from 'vitest';
import { MALI_EMERGENCY_CONTACTS, getMaliEmergencyContactNumbers } from './maliEmergencyNumbers';

describe('maliEmergencyNumbers', () => {
  it('a des numéros uniques et valides', () => {
    const nums = getMaliEmergencyContactNumbers();
    expect(new Set(nums).size).toBe(nums.length);
    for (const n of nums) {
      expect(n).toMatch(/^\d{3}$/);
    }
  });

  it('expose une entrée par service attendu', () => {
    const ids = new Set(MALI_EMERGENCY_CONTACTS.map((c) => c.id));
    expect(ids.has('police')).toBe(true);
    expect(ids.has('pompiers')).toBe(true);
    expect(ids.has('garde')).toBe(true);
  });
});
