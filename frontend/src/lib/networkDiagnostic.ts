/**
 * Module de diagnostic réseau pur — utilisable depuis l'écran "Diagnostic" admin
 * et depuis les outils de support pour récolter de vraies métriques en Mali / Sénégal /
 * Côte d'Ivoire.
 *
 * Aucune dépendance native ; les fonctions de calcul sont déterministes pour pouvoir
 * être testées (Vitest) sans `fetch`.
 */

export interface PingSample {
  durationMs: number;
  ok: boolean;
  statusCode?: number;
  errorMessage?: string;
}

export interface PingStats {
  attempts: number;
  successes: number;
  failures: number;
  /** Moyenne arithmétique sur les requêtes réussies (ms). */
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  /** Écart type (jitter). Plus c'est élevé, plus le réseau est instable. */
  jitterMs: number | null;
  /** Taux de réussite [0, 1]. */
  successRate: number;
}

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';

export interface NetworkClassification {
  quality: NetworkQuality;
  /** Justification courte côté UI. */
  reason: string;
}

export interface ThroughputSample {
  /** Taille du payload uploadé (octets). */
  bytes: number;
  /** Durée totale de la requête (incluant TCP + TLS + HTTP). */
  durationMs: number;
  ok: boolean;
}

export interface ThroughputStats {
  bytes: number;
  durationMs: number;
  /** Débit calculé à partir de la requête réussie (kbits/s). `null` si toutes ont échoué. */
  kbps: number | null;
}

export function computePingStats(samples: ReadonlyArray<PingSample>): PingStats {
  const attempts = samples.length;
  const successful = samples.filter((s) => s.ok && Number.isFinite(s.durationMs));
  const successes = successful.length;
  const failures = attempts - successes;

  if (successes === 0) {
    return {
      attempts,
      successes: 0,
      failures,
      avgMs: null,
      minMs: null,
      maxMs: null,
      jitterMs: null,
      successRate: 0,
    };
  }

  const durations = successful.map((s) => s.durationMs);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avgMs = sum / successes;
  const minMs = Math.min(...durations);
  const maxMs = Math.max(...durations);

  const variance =
    durations.reduce((acc, d) => acc + (d - avgMs) ** 2, 0) / successes;
  const jitterMs = Math.sqrt(variance);

  return {
    attempts,
    successes,
    failures,
    avgMs: Math.round(avgMs * 10) / 10,
    minMs: Math.round(minMs * 10) / 10,
    maxMs: Math.round(maxMs * 10) / 10,
    jitterMs: Math.round(jitterMs * 10) / 10,
    successRate: Math.round((successes / attempts) * 100) / 100,
  };
}

export function classifyNetwork(stats: PingStats): NetworkClassification {
  if (stats.attempts === 0) {
    return { quality: 'unusable', reason: 'Aucune mesure disponible.' };
  }
  if (stats.successRate < 0.5) {
    return {
      quality: 'unusable',
      reason: `Trop d'échecs : ${stats.failures}/${stats.attempts} requêtes ont échoué.`,
    };
  }
  if (stats.avgMs == null) {
    return { quality: 'unusable', reason: 'Latence non mesurable.' };
  }
  if (stats.successRate < 0.9) {
    return {
      quality: 'poor',
      reason: `Réseau instable (${Math.round(stats.successRate * 100)}% de succès).`,
    };
  }
  if (stats.jitterMs != null && stats.jitterMs > 300) {
    return {
      quality: 'poor',
      reason: `Jitter élevé (${stats.jitterMs} ms) — connexion 2G/3G dégradée.`,
    };
  }
  if (stats.avgMs > 800) {
    return {
      quality: 'poor',
      reason: `Latence très élevée (${stats.avgMs} ms).`,
    };
  }
  if (stats.avgMs > 400) {
    return {
      quality: 'fair',
      reason: `Latence acceptable (${stats.avgMs} ms) — uploads vidéo seront longs.`,
    };
  }
  if (stats.avgMs > 150) {
    return {
      quality: 'good',
      reason: `Latence correcte (${stats.avgMs} ms).`,
    };
  }
  return {
    quality: 'excellent',
    reason: `Réseau rapide (${stats.avgMs} ms en moyenne, jitter ${stats.jitterMs} ms).`,
  };
}

export function computeThroughputKbps(sample: ThroughputSample): ThroughputStats {
  if (!sample.ok || !Number.isFinite(sample.durationMs) || sample.durationMs <= 0) {
    return { bytes: sample.bytes, durationMs: sample.durationMs, kbps: null };
  }
  const bits = sample.bytes * 8;
  const seconds = sample.durationMs / 1000;
  const kbps = Math.round((bits / 1000 / seconds) * 10) / 10;
  return { bytes: sample.bytes, durationMs: sample.durationMs, kbps };
}

export interface DiagnosticReport {
  generatedAt: string;
  backendOrigin: string;
  pingStats: PingStats;
  classification: NetworkClassification;
  throughput?: ThroughputStats | null;
  /** Notes additionnelles (ex. région Render, version app). */
  notes: Record<string, string>;
}

export function formatDiagnosticReport(report: DiagnosticReport): string {
  const lines: string[] = [];
  lines.push('=== AfriWonder · Diagnostic réseau ===');
  lines.push(`Date : ${report.generatedAt}`);
  lines.push(`Backend : ${report.backendOrigin}`);
  lines.push('');
  lines.push('--- Ping /health ---');
  lines.push(`Tentatives : ${report.pingStats.attempts}`);
  lines.push(`Réussites  : ${report.pingStats.successes}`);
  lines.push(`Échecs     : ${report.pingStats.failures}`);
  lines.push(`Latence moy : ${report.pingStats.avgMs ?? '—'} ms`);
  lines.push(`Latence min : ${report.pingStats.minMs ?? '—'} ms`);
  lines.push(`Latence max : ${report.pingStats.maxMs ?? '—'} ms`);
  lines.push(`Jitter      : ${report.pingStats.jitterMs ?? '—'} ms`);
  lines.push(`Taux succès : ${Math.round(report.pingStats.successRate * 100)}%`);
  lines.push('');
  lines.push(`Qualité : ${report.classification.quality.toUpperCase()}`);
  lines.push(`→ ${report.classification.reason}`);
  if (report.throughput) {
    lines.push('');
    lines.push('--- Débit upload ---');
    lines.push(`Taille  : ${report.throughput.bytes} octets`);
    lines.push(`Durée   : ${report.throughput.durationMs} ms`);
    lines.push(`Débit   : ${report.throughput.kbps ?? '—'} kbps`);
  }
  if (Object.keys(report.notes).length > 0) {
    lines.push('');
    lines.push('--- Notes ---');
    for (const [k, v] of Object.entries(report.notes)) {
      lines.push(`${k} : ${v}`);
    }
  }
  return lines.join('\n');
}
