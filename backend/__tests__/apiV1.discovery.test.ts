import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('API v1 (durabilité ch.1)', () => {
  it('GET /api/v1 expose les entrées versionnées', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('afriwonder-api');
    expect(res.body.api_version).toBe(1);
    expect(String(res.body.health)).toContain('/api/v1/health');
  });

  it('GET /api/v1/health répond comme /api/health', async () => {
    const v1 = await request(app).get('/api/v1/health');
    const legacy = await request(app).get('/api/health');
    expect([200, 503]).toContain(v1.status);
    expect(legacy.status).toBe(v1.status);
    expect(v1.body).toHaveProperty('db');
    expect(v1.body).toHaveProperty('redis');
  });
});
