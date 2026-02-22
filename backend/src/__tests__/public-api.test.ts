import request from 'supertest';
import { describe, expect, it } from '@jest/globals';
import app from '../app.js';

describe('Public API', () => {
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
    const oldLimit = process.env.PUBLIC_API_RATE_LIMIT_PER_MIN;
    const oldKeys = process.env.PUBLIC_API_KEYS;
    process.env.PUBLIC_API_RATE_LIMIT_PER_MIN = '1';
    process.env.PUBLIC_API_KEYS = 'test_rate_key';

    const first = await request(app)
      .get('/api/public/v1/matching/opportunities?limit=2')
      .set('x-api-key', 'test_rate_key');
    const second = await request(app)
      .get('/api/public/v1/matching/opportunities?limit=2')
      .set('x-api-key', 'test_rate_key');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);

    process.env.PUBLIC_API_RATE_LIMIT_PER_MIN = oldLimit;
    process.env.PUBLIC_API_KEYS = oldKeys;
  });
});
