/**
 * QA - CIVIC/SOCIETE: Events
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Events API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Event123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `event${Date.now()}@example.com`,
        password_hash: hashed,
        username: `eventuser${Date.now()}`,
        full_name: 'Event User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Event123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'event' } } }).catch(() => {});
  });

  it('GET /api/events returns list', async () => {
    const res = await request(app).get('/api/events').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/events/my-tickets auth', async () => {
    const res = await request(app)
      .get('/api/events/my-tickets')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
