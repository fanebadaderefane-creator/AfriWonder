/**
 * QA - Education: Cours en ligne, enrollments, instructeurs
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Courses API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Course123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `course${Date.now()}@example.com`,
        password_hash: hashed,
        username: `courseuser${Date.now()}`,
        full_name: 'Course User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Course123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'course' } } }).catch(() => {});
  });

  it('GET /api/courses returns list', async () => {
    const res = await request(app).get('/api/courses').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/courses/wishlist auth', async () => {
    const res = await request(app)
      .get('/api/courses/wishlist')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/courses/instructor/dashboard auth', async () => {
    const res = await request(app)
      .get('/api/courses/instructor/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
