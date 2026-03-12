/**
 * Métriques au format Prometheus (exposition pour scraper) — CDC Observabilité.
 * GET /metrics retourne text/plain avec counters, gauges et histogram.
 */

import { getHttpMetricsSummary } from './httpMetrics.service.js';

const BUCKETS_MS = [5, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function escapeLabelValue(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function formatCounter(name: string, help: string, value: number, labels: Record<string, string> = {}): string {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
    .join(',');
  return `# TYPE ${name} counter\n# HELP ${name} ${help}\n${name}{${labelStr}} ${value}\n`;
}

function formatGauge(name: string, help: string, value: number, labels: Record<string, string> = {}): string {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
    .join(',');
  return `# TYPE ${name} gauge\n# HELP ${name} ${help}\n${name}{${labelStr}} ${value}\n`;
}

function formatHistogramFromLatencies(name: string, help: string, latenciesMs: number[]): string {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const n = sorted.length;
  let out = `# TYPE ${name} histogram\n# HELP ${name} ${help}\n`;
  for (const b of BUCKETS_MS) {
    const count = sorted.filter((ms) => ms <= b).length;
    out += `${name}_bucket{le="${b / 1000}"} ${count}\n`;
  }
  out += `${name}_bucket{le="+Inf"} ${n}\n`;
  const sum = sorted.reduce((a, x) => a + x, 0);
  out += `${name}_sum ${(sum / 1000).toFixed(6)}\n`;
  out += `${name}_count ${n}\n`;
  return out;
}

/**
 * Retourne le corps texte Prometheus (exposition format).
 */
export function getPrometheusExposition(): string {
  const summary = getHttpMetricsSummary();
  const lines: string[] = [];

  lines.push(formatGauge('afriwonder_uptime_seconds', 'Process uptime in seconds', summary.uptime_sec));
  lines.push(formatCounter('afriwonder_http_requests_total', 'Total HTTP requests', summary.total_requests));
  lines.push(formatCounter('afriwonder_http_requests_errors_total', 'Total HTTP requests with status >= 400', summary.total_errors));

  const latencies = (summary as { recent_latencies_ms?: number[] }).recent_latencies_ms ?? [];
  if (latencies.length > 0) {
    lines.push(formatHistogramFromLatencies('afriwonder_http_request_duration_seconds', 'HTTP request duration in seconds', latencies));
  }

  for (const route of summary.top_routes) {
    const parts = route.route.split(' ', 2);
    const method = parts[0] || 'GET';
    const path = parts[1] || '/';
    lines.push(formatCounter('afriwonder_http_requests_by_route_total', 'HTTP requests by route', route.count, { method, path }));
    lines.push(formatCounter('afriwonder_http_errors_by_route_total', 'HTTP errors by route', route.errors, { method, path }));
  }

  return lines.join('');
}
