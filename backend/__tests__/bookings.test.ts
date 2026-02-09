/**
 * QA - E-COMMERCE: Reservations (services locaux)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Bookings API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Book123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `book${Date.now()}@example.com`,
        password_hash: hashed,
        username: `bookuser${Date.now()}`,
        full_name: 'Book User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Book123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'book' } } }).catch(() => {});
  });

  it('GET /api/bookings as customer', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ as: 'customer', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
