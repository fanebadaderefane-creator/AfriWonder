/**
 * QA - TECH: Platform (admin-style endpoints)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Platform API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Platform123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `platform${Date.now()}@example.com`,
        password_hash: hashed,
        username: `platformuser${Date.now()}`,
        full_name: 'Platform User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Platform123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'platform' } } }).catch(() => {});
  });

  it('GET /api/platform/revenue requires admin (normal user gets 403)', async () => {
    const res = await request(app)
      .get('/api/platform/revenue')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
