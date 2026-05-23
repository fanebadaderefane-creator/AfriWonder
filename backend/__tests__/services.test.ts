/**
 * QA - E-COMMERCE: Services locaux
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Services API (local services)', () => {
  let authToken: string;
  let userId: string;
  const suffix = `svc${Date.now()}`;
  const email = `services_${suffix}@example.com`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('ServicesTest123!', 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: `svc_${suffix}`,
        password_hash: passwordHash,
        full_name: 'Services QA',
      },
    });
    userId = user.id;

    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'ServicesTest123!' });
    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { user_id: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('GET /api/services returns list (auth + plan free view_services)', async () => {
    const res = await request(app)
      .get('/api/services')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
