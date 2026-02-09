/**
 * QA - News / Articles
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('News API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('News123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `news${Date.now()}@example.com`,
        password_hash: hashed,
        username: `newsuser${Date.now()}`,
        full_name: 'News User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'News123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'news' } } }).catch(() => {});
  });

  it('GET /api/news returns list', async () => {
    const res = await request(app).get('/api/news').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/news/breaking', async () => {
    const res = await request(app).get('/api/news/breaking');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/news/trending', async () => {
    const res = await request(app).get('/api/news/trending').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/news/feed with auth', async () => {
    const res = await request(app)
      .get('/api/news/feed')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
