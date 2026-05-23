import request from 'supertest';
import { describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { __resetPublicApiRateLimitsForTests } from '../middleware/publicApiKey.middleware.js';

describe('Public API', () => {
  it('GET /api/health returns db status and uptime (monitoring)', async () => {
    const response = await request(app).get('/api/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(ok|degraded)$/),
        db: expect.stringMatching(/^(ok|error)$/),
        redis: expect.stringMatching(/^(ok|skipped|error)$/),
        uptime_seconds: expect.any(Number),
        version: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  });

  it('returns health without api key', async () => {
    const response = await request(app).get('/api/public/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('blocks matching opportunities without api key', async () => {
    const response = await request(app).get('/api/public/matching/opportunities');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns matching opportunities with valid api key', async () => {
    const response = await request(app)
      .get('/api/public/matching/opportunities?goal=earn_money&location=Bamako&skills=design,marketing&limit=5')
      .set('x-api-key', 'afw_public_dev_key');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        goal: expect.any(String),
        opportunities: expect.any(Array),
      })
    );
  });

  it('supports versioned v1 route', async () => {
    const response = await request(app)
      .get('/api/public/v1/matching/opportunities?goal=learn&limit=3')
      .set('x-api-key', 'afw_public_dev_key');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.opportunities)).toBe(true);
  });

  it('returns usage observability for v1 api key', async () => {
    await request(app)
      .get('/api/public/v1/matching/opportunities?goal=earn_money&limit=2')
      .set('x-api-key', 'afw_public_dev_key');

    const response = await request(app)
      .get('/api/public/v1/usage?sinceHours=24')
      .set('x-api-key', 'afw_public_dev_key');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        keyAlias: expect.any(String),
        totals: expect.objectContaining({
          calls: expect.any(Number),
        }),
        distribution: expect.objectContaining({
          byEndpoint: expect.any(Object),
          byStatus: expect.any(Object),
        }),
        quota: expect.objectContaining({
          minute: expect.any(Object),
          day: expect.any(Object),
        }),
      })
    );
  });

  it('applies per-key rate limit', async () => {
    __resetPublicApiRateLimitsForTests();
    const oldLimit = process.env.PUBLIC_API_RATE_LIMIT_PER_MIN;
    const oldKeys = process.env.PUBLIC_API_KEYS;
    const key = `test_rate_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      process.env.PUBLIC_API_RATE_LIMIT_PER_MIN = '1';
      process.env.PUBLIC_API_KEYS = key;

      const first = await request(app)
        .get('/api/public/v1/matching/opportunities?limit=2')
        .set('x-api-key', key);
      const second = await request(app)
        .get('/api/public/v1/matching/opportunities?limit=2')
        .set('x-api-key', key);

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
    } finally {
      process.env.PUBLIC_API_RATE_LIMIT_PER_MIN = oldLimit;
      process.env.PUBLIC_API_KEYS = oldKeys;
    }
  });
});
