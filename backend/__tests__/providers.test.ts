/**
 * QA - E-COMMERCE: Prestataires (services locaux)
 */
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('Providers API', () => {
  it('GET /api/providers returns list', async () => {
    const res = await request(app).get('/api/providers').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
