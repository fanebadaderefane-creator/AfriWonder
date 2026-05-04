import { describe, expect, it } from 'vitest';
import {
  classifyNetwork,
  computePingStats,
  computeThroughputKbps,
  formatDiagnosticReport,
  type DiagnosticReport,
  type PingSample,
} from './networkDiagnostic';

describe('computePingStats', () => {
  it('renvoie tout à null sur 0 succès', () => {
    const stats = computePingStats([
      { durationMs: 0, ok: false, errorMessage: 'timeout' },
      { durationMs: 0, ok: false, errorMessage: 'aborted' },
    ]);
    expect(stats.attempts).toBe(2);
    expect(stats.successes).toBe(0);
    expect(stats.failures).toBe(2);
    expect(stats.avgMs).toBeNull();
    expect(stats.minMs).toBeNull();
    expect(stats.maxMs).toBeNull();
    expect(stats.jitterMs).toBeNull();
    expect(stats.successRate).toBe(0);
  });

  it('calcule moyenne, min, max sur succès uniquement', () => {
    const stats = computePingStats([
      { durationMs: 100, ok: true },
      { durationMs: 200, ok: true },
      { durationMs: 300, ok: true },
      { durationMs: 0, ok: false, errorMessage: 'fail' },
    ]);
    expect(stats.attempts).toBe(4);
    expect(stats.successes).toBe(3);
    expect(stats.failures).toBe(1);
    expect(stats.avgMs).toBe(200);
    expect(stats.minMs).toBe(100);
    expect(stats.maxMs).toBe(300);
    expect(stats.jitterMs).toBeGreaterThan(0);
    expect(stats.successRate).toBe(0.75);
  });

  it('jitter est 0 quand toutes les latences sont identiques', () => {
    const stats = computePingStats([
      { durationMs: 50, ok: true },
      { durationMs: 50, ok: true },
      { durationMs: 50, ok: true },
    ]);
    expect(stats.avgMs).toBe(50);
    expect(stats.jitterMs).toBe(0);
  });
});

describe('classifyNetwork', () => {
  it('renvoie unusable sans aucune mesure', () => {
    const cls = classifyNetwork(computePingStats([]));
    expect(cls.quality).toBe('unusable');
  });

  it('renvoie unusable si trop d échecs', () => {
    const cls = classifyNetwork(
      computePingStats([
        { durationMs: 0, ok: false },
        { durationMs: 0, ok: false },
        { durationMs: 0, ok: false },
        { durationMs: 100, ok: true },
      ]),
    );
    expect(cls.quality).toBe('unusable');
  });

  it('détecte poor sur jitter élevé même si la latence moyenne reste sous 400 ms', () => {
    const samples: PingSample[] = [
      { durationMs: 100, ok: true },
      { durationMs: 100, ok: true },
      { durationMs: 100, ok: true },
      { durationMs: 1100, ok: true },
      { durationMs: 100, ok: true },
    ];
    const stats = computePingStats(samples);
    expect(stats.avgMs).toBeLessThan(400);
    expect(stats.jitterMs).toBeGreaterThan(300);
    const cls = classifyNetwork(stats);
    expect(cls.quality).toBe('poor');
    expect(cls.reason).toMatch(/jitter|2G|3G/i);
  });

  it('détecte fair entre 400 et 800ms', () => {
    const cls = classifyNetwork(
      computePingStats([
        { durationMs: 500, ok: true },
        { durationMs: 510, ok: true },
        { durationMs: 490, ok: true },
      ]),
    );
    expect(cls.quality).toBe('fair');
  });

  it('détecte good entre 150 et 400ms', () => {
    const cls = classifyNetwork(
      computePingStats([
        { durationMs: 200, ok: true },
        { durationMs: 210, ok: true },
        { durationMs: 195, ok: true },
      ]),
    );
    expect(cls.quality).toBe('good');
  });

  it('détecte excellent < 150ms', () => {
    const cls = classifyNetwork(
      computePingStats([
        { durationMs: 80, ok: true },
        { durationMs: 90, ok: true },
        { durationMs: 75, ok: true },
      ]),
    );
    expect(cls.quality).toBe('excellent');
  });

  it('détecte poor sur taux échec entre 50 et 90 %', () => {
    const cls = classifyNetwork(
      computePingStats([
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 100, ok: true },
        { durationMs: 0, ok: false },
        { durationMs: 0, ok: false },
        { durationMs: 0, ok: false },
      ]),
    );
    expect(cls.quality).toBe('poor');
    expect(cls.reason).toMatch(/instable/);
  });
});

describe('computeThroughputKbps', () => {
  it('renvoie null si la requête a échoué', () => {
    expect(computeThroughputKbps({ bytes: 1024, durationMs: 100, ok: false }).kbps).toBeNull();
  });

  it('renvoie null si la durée est 0 ou négative', () => {
    expect(computeThroughputKbps({ bytes: 1024, durationMs: 0, ok: true }).kbps).toBeNull();
  });

  it('calcule des kbps cohérents (100 KB en 1s = 800 kbps)', () => {
    const stat = computeThroughputKbps({ bytes: 100_000, durationMs: 1000, ok: true });
    expect(stat.kbps).toBe(800);
  });

  it('arrondit à 1 décimale', () => {
    const stat = computeThroughputKbps({ bytes: 12345, durationMs: 678, ok: true });
    expect(typeof stat.kbps).toBe('number');
    expect(stat.kbps).not.toBeNaN();
  });
});

describe('formatDiagnosticReport', () => {
  it('produit un rapport texte lisible', () => {
    const report: DiagnosticReport = {
      generatedAt: '2026-05-04T16:00:00Z',
      backendOrigin: 'https://afriwonder.onrender.com',
      pingStats: computePingStats([
        { durationMs: 80, ok: true },
        { durationMs: 90, ok: true },
        { durationMs: 110, ok: true },
      ]),
      classification: { quality: 'excellent', reason: 'Réseau rapide' },
      throughput: computeThroughputKbps({ bytes: 100_000, durationMs: 1000, ok: true }),
      notes: { region: 'frankfurt', appVersion: '1.0.0' },
    };
    const text = formatDiagnosticReport(report);
    expect(text).toContain('AfriWonder');
    expect(text).toContain('Backend : https://afriwonder.onrender.com');
    expect(text).toContain('EXCELLENT');
    expect(text).toContain('region : frankfurt');
    expect(text).toContain('Débit');
  });

  it('omet la section débit quand throughput absent', () => {
    const report: DiagnosticReport = {
      generatedAt: 'now',
      backendOrigin: 'x',
      pingStats: computePingStats([{ durationMs: 100, ok: true }]),
      classification: { quality: 'good', reason: 'OK' },
      notes: {},
    };
    expect(formatDiagnosticReport(report)).not.toContain('Débit upload');
  });
});
