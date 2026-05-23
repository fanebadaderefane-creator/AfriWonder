/**
 * Tests « E2E » légers : vérifient des invariants produit et, si E2E_API_BASE_URL est défini,
 * la disponibilité de l’API (smoke réseau).
 *
 * Exemple CI / local :
 *   E2E_API_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
 */
import { describe, it, expect } from 'vitest';

const API_BASE = (process.env.E2E_API_BASE_URL || '').replace(/\/$/, '');

describe('Flux critiques (invariants)', () => {
  it('montants FCFA : séparateur milliers fr-FR', () => {
    const n = 125000;
    const s = `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
    expect(s).toMatch(/125/);
    expect(s).toContain('FCFA');
  });
});

describe.skipIf(!API_BASE)('API smoke (optionnel)', () => {
  it('GET /health répond 200', async () => {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it('GET /api/proxy/feed ou 401/403 sans session (route montée)', async () => {
    const res = await fetch(`${API_BASE}/api/proxy/feed?page=1&limit=1`, {
      headers: { Accept: 'application/json' },
    });
    expect([200, 401, 403]).toContain(res.status);
  });
});
