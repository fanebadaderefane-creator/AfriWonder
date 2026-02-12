import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getHttpMetricsSummary,
  recordHttpMetric,
  resetHttpMetricsForTests,
} from '../httpMetrics.service.js';

describe('httpMetrics.service', () => {
  beforeEach(() => {
    resetHttpMetricsForTests();
  });

  it('recordHttpMetric cumule les stats et expose un p95 global', () => {
    recordHttpMetric({ method: 'GET', path: '/api/products', statusCode: 200, durationMs: 40 });
    recordHttpMetric({ method: 'GET', path: '/api/products', statusCode: 500, durationMs: 220 });
    recordHttpMetric({ method: 'POST', path: '/api/orders', statusCode: 201, durationMs: 130 });

    const summary = getHttpMetricsSummary();

    expect(summary.total_requests).toBe(3);
    expect(summary.total_errors).toBe(1);
    expect(summary.p95_ms).not.toBeNull();
    expect(summary.top_routes.length).toBeGreaterThan(0);
  });

  it('error_rate est 0 quand aucune requete', () => {
    const summary = getHttpMetricsSummary();
    expect(summary.total_requests).toBe(0);
    expect(summary.error_rate).toBe(0);
    expect(summary.p95_ms).toBeNull();
  });
});

