import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ErrorContext } from '../errorMonitoring.service.js';

describe('errorMonitoring.service', () => {
  let mod: typeof import('../errorMonitoring.service.js');

  beforeEach(async () => {
    jest.resetModules();
    mod = await import('../errorMonitoring.service.js');
    jest.restoreAllMocks();
  });

  it('captureError enregistre une erreur en mémoire et incrémente le compteur', async () => {
    const error = new Error('Test error') as Error & { statusCode?: number };
    error.statusCode = 400;

    const ctx: ErrorContext = {
      path: '/test',
      method: 'GET',
      statusCode: 400,
      userId: 'u1',
    };

    const entry = await mod.captureError(error, ctx);

    expect(entry.message).toBe('Test error');
    expect(entry.path).toBe('/test');

    const summary = mod.getErrorsSummary();
    expect(summary.countLast24h).toBeGreaterThan(0);
    expect(summary.lastErrors.length).toBeGreaterThan(0);
  });

  it('getErrorsSummary retourne un objet avec les bons champs', () => {
    const summary = mod.getErrorsSummary();
    expect(summary).toHaveProperty('countLast24h');
    expect(summary).toHaveProperty('lastErrors');
    expect(summary).toHaveProperty('storedTotal');
  });
});

