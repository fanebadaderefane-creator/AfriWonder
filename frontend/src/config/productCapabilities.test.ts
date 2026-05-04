import { describe, it, expect } from 'vitest';
import { PRODUCT_CAPABILITY_PILLARS, capabilityLevelLabelFr } from './productCapabilities';

describe('productCapabilities', () => {
  it('a des ids uniques', () => {
    const ids = PRODUCT_CAPABILITY_PILLARS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque pilier a un niveau avec libellé FR', () => {
    for (const p of PRODUCT_CAPABILITY_PILLARS) {
      expect(capabilityLevelLabelFr[p.level]).toBeTruthy();
      expect(p.codeRefs.length).toBeGreaterThan(0);
    }
  });
});
