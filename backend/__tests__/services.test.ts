/**
 * QA - E-COMMERCE: Services locaux
 */
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('Services API (local services)', () => {
  it('GET /api/services returns list', async () => {
    const res = await request(app).get('/api/services').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
