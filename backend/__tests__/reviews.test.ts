/**
 * QA - E-COMMERCE: Reviews and ratings
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Reviews API', () => {
  let token: string;
  let user: any;
  let productId: string;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Review123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `review${Date.now()}@example.com`,
        password_hash: hashed,
        username: `reviewuser${Date.now()}`,
        full_name: 'Review User',
      },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Product for review',
        description: 'Desc',
        price: 100,
        seller_id: user.id,
        images: [],
      },
    });
    productId = product.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Review123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.review.deleteMany({}).catch(() => {});
    await prisma.product.deleteMany({ where: { id: productId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: 'review' } } }).catch(() => {});
  });

  it('GET /api/reviews/product/:productId returns list', async () => {
    const res = await request(app)
      .get(`/api/reviews/product/${productId}`)
      .query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
