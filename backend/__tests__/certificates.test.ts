/**
 * QA - Certifications
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Certificates API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Cert123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `cert${Date.now()}@example.com`,
        password_hash: hashed,
        username: `certuser${Date.now()}`,
        full_name: 'Cert User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Cert123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'cert' } } }).catch(() => {});
  });

  it('GET /api/certificates returns array', async () => {
    const res = await request(app)
      .get('/api/certificates')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET verify invalid token', async () => {
    const res = await request(app).get('/api/certificates/verify/invalid-token-xyz');
    expect(res.status).toBe(404);
  });
});
