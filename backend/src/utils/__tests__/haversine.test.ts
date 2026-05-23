/**
 * Tests unitaires pour utils/haversine.ts
 */
import { describe, it, expect } from '@jest/globals';

describe('haversineKm', () => {
  it('retourne 0 pour le même point', async () => {
    const { haversineKm } = await import('../haversine.js');
    const d = haversineKm(0, 0, 0, 0);
    expect(d).toBeCloseTo(0, 5);
  });

  it('calcule une distance approximative correcte entre deux villes', async () => {
    const { haversineKm } = await import('../haversine.js');
    // Bamako (~12.6392, -8.0029) -> Dakar (~14.7167, -17.4677)
    const d = haversineKm(12.6392, -8.0029, 14.7167, -17.4677);
    // Distance réelle ~1100 km, on accepte une marge
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1300);
  });
});

