import { describe, expect, it } from '@jest/globals';
import { computeCoverageMetrics } from '../../src/services/videoLowQualityCoverage.service.js';

describe('videoLowQualityCoverage', () => {
  it('ok à 95% avec pipeline actif', () => {
    const m = computeCoverageMetrics({
      totalEligible: 100,
      withLowQuality: 95,
      recentHdOnly7d: 1,
      pipelineEnabled: true,
    });
    expect(m.alert_level).toBe('ok');
    expect(m.coverage_pct).toBe(95);
    expect(m.alerts).toHaveLength(0);
  });

  it('critical sous 70%', () => {
    const m = computeCoverageMetrics({
      totalEligible: 100,
      withLowQuality: 60,
      recentHdOnly7d: 0,
      pipelineEnabled: true,
    });
    expect(m.alert_level).toBe('critical');
    expect(m.hd_only).toBe(40);
  });

  it('critical si pipeline désactivé', () => {
    const m = computeCoverageMetrics({
      totalEligible: 10,
      withLowQuality: 10,
      recentHdOnly7d: 0,
      pipelineEnabled: false,
    });
    expect(m.alert_level).toBe('critical');
  });

  it('warn si beaucoup de HD récentes', () => {
    const m = computeCoverageMetrics({
      totalEligible: 100,
      withLowQuality: 92,
      recentHdOnly7d: 8,
      pipelineEnabled: true,
    });
    expect(m.alert_level).toBe('warn');
    expect(m.alerts.some((a) => a.includes('7 j'))).toBe(true);
  });
});
