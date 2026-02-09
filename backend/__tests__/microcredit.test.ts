/**
 * QA - FINANCE: Microcredit / prets
 * GET /api/microcredit, GET /api/microcredit/:id
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Microcredit API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Micro123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `micro${Date.now()}@example.com`,
        password_hash: hashed,
        username: `microuser${Date.now()}`,
        full_name: 'Micro User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Micro123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'micro' } } }).catch(() => {});
  });

  it('GET /api/microcredit returns list', async () => {
    const res = await request(app).get('/api/microcredit').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
