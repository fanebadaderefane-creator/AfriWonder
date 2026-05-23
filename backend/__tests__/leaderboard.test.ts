/**
 * QA - GAMIFICATION: Leaderboard
 */
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('Leaderboard API', () => {
  it('GET /api/leaderboard returns data', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .query({ range: 'weekly', limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
