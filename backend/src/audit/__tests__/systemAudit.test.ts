import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runAuditChecks, systemAudit, autoFixSystem } from '../systemAudit.js';

describe('systemAudit', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = { ...prev };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('runAuditChecks retourne les champs attendus', () => {
    const r = runAuditChecks();
    expect(typeof r.e2eTests).toBe('boolean');
    expect(typeof r.microservicesReady).toBe('boolean');
    expect(typeof r.cdnEnabled).toBe('boolean');
    expect(typeof r.scalableWebSocket).toBe('boolean');
    expect(typeof r.realMobileMoney).toBe('boolean');
    expect(r.details.e2eTests.length).toBeGreaterThan(5);
    expect(typeof r.productionReady).toBe('boolean');
    expect(r.environment).toBeTruthy();
  });

  it('met à jour l’export systemAudit (snapshot)', () => {
    runAuditChecks();
    expect(typeof systemAudit.e2eTests).toBe('boolean');
  });

  it('autoFixSystem retourne un rapport avec artefacts / actions', async () => {
    const rep = await autoFixSystem();
    expect(rep.audit).toBeDefined();
    expect(rep.actions.length).toBe(5);
    expect(rep.actions.every((a) => ['partial', 'done', 'applied'].includes(a.status))).toBe(true);
    expect(rep.actions.every((a) => a.message.length > 0)).toBe(true);
    expect(Array.isArray(rep.appliedArtifacts)).toBe(true);
    expect(typeof rep.summary).toBe('string');
    expect(Array.isArray(rep.audit.deliveryPlan)).toBe(true);
    expect(rep.audit.deliveryPlan.length).toBeGreaterThanOrEqual(7);
  });

  it('production: refuse Orange mock', () => {
    process.env.NODE_ENV = 'production';
    process.env.ORANGE_MONEY_MOCK = 'true';
    process.env.ORANGE_MONEY_MERCHANT_ID = 'm';
    process.env.ORANGE_MONEY_API_KEY = 'k';
    process.env.WAVE_API_KEY = 'w';
    process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY = '';
    const r = runAuditChecks();
    expect(r.realMobileMoney).toBe(false);
    expect(r.details.realMobileMoney).toContain('ORANGE_MONEY_MOCK');
  });
});
