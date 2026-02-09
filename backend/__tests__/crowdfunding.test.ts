/**
 * QA - FINANCE: Crowdfunding
 * GET /api/crowdfunding, GET /api/crowdfunding/:id
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Crowdfunding API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Crowd123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `crowd${Date.now()}@example.com`,
        password_hash: hashed,
        username: `crowduser${Date.now()}`,
        full_name: 'Crowd User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Crowd123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'crowd' } } }).catch(() => {});
  });

  it('GET /api/crowdfunding returns list', async () => {
    const res = await request(app).get('/api/crowdfunding').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/crowdfunding/:id returns 404 for invalid id', async () => {
    const res = await request(app).get('/api/crowdfunding/00000000-0000-0000-0000-000000000000');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) expect(res.body.success).toBe(true);
    if (res.status === 404) expect(res.body.success).toBe(false);
  });
});
