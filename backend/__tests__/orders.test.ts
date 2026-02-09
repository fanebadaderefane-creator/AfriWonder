/**
 * QA - Commandes: list, get, config, stats
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Orders API', () => {
  let user: any;
  let token: string;
  let order: any;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `ord${Date.now()}@example.com`,
        password_hash: hashed,
        username: `orduser${Date.now()}`,
        full_name: 'Order User',
      },
    });
    order = await prisma.order.create({
      data: {
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending',
        currency: 'XOF',
        subtotal_amount: 10000,
        shipping_amount: 0,
        tax_amount: 0,
        total_amount: 10000,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/orders', () => {
    it('devrait lister les commandes de l utilisateur', async () => {
      const res = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orders');
      expect(res.body.data).toHaveProperty('pagination');
    });
  });

  describe('GET /api/orders/config', () => {
    it('devrait retourner la config publique sans auth', async () => {
      const res = await request(app).get('/api/orders/config');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('cancellation_deadline_hours');
    });
  });

  describe('GET /api/orders/stats', () => {
    it('devrait retourner les stats commandes', async () => {
      const res = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
