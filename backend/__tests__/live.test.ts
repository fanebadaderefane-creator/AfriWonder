/**
 * QA — SOCIAL & CONTENU: Live streaming + gifts
 * GET /api/live, /api/live/discovery, /api/live/gifts, /api/live/wallet (auth)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Live API (streaming + gifts)', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Live123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `live${Date.now()}@example.com`,
        password_hash: hashed,
        username: `liveuser${Date.now()}`,
        full_name: 'Live User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Live123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'live' } } }).catch(() => {});
  });

  it('GET /api/live — liste des streams', async () => {
    const res = await request(app).get('/api/live').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/live/discovery — discovery (popular)', async () => {
    const res = await request(app).get('/api/live/discovery').query({ type: 'popular', limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/live/gifts — catalogue cadeaux', async () => {
    const res = await request(app).get('/api/live/gifts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/live/wallet — wallet live (auth)', async () => {
    const res = await request(app)
      .get('/api/live/wallet')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
