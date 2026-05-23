/**
 * QA - E-COMMERCE: Seller dashboard
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Seller API (dashboard)', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Seller123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `seller${Date.now()}@example.com`,
        password_hash: hashed,
        username: `selleruser${Date.now()}`,
        full_name: 'Seller User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Seller123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'seller' } } }).catch(() => {});
  });

  it('GET /api/seller/analytics', async () => {
    const res = await request(app)
      .get('/api/seller/analytics')
      .query({ period: '30d' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
