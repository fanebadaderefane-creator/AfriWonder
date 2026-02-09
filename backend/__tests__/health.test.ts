/**
 * QA — Health & readiness
 */
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('Health API', () => {
  describe('GET /health', () => {
    it('devrait retourner 200 et status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('devrait retourner 200 si DB connectée', async () => {
      const res = await request(app).get('/health/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      if (res.status === 200) expect(res.body.db).toBe('connected');
    });
  });
});
