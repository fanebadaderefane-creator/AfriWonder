/**
 * QA - GAMIFICATION: Challenges
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Challenges API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Challenge123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `challenge${Date.now()}@example.com`,
        password_hash: hashed,
        username: `challengeuser${Date.now()}`,
        full_name: 'Challenge User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Challenge123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'challenge' } } }).catch(() => {});
  });

  it('GET /api/challenges returns list', async () => {
    const res = await request(app).get('/api/challenges').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
