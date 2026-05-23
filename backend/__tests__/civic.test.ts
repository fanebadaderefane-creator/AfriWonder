/**
 * QA - Petitions (civic)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Civic API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Civic123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `civic${Date.now()}@example.com`,
        password_hash: hashed,
        username: `civicuser${Date.now()}`,
        full_name: 'Civic User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Civic123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'civic' } } }).catch(() => {});
  });

  it('GET /api/civic returns list', async () => {
    const res = await request(app).get('/api/civic').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/civic/recommended with auth', async () => {
    const res = await request(app)
      .get('/api/civic/recommended')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
