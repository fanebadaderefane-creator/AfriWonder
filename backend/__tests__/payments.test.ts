/**
 * Tests d'intégration API paiements (plan stratégie tests)
 * Endpoints /api/payments/* : création intent Stripe, vérification, auth requise
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Payments API', () => {
  let user: any;
  let token: string;
  const ts = Date.now();

  beforeEach(async () => {
    const hashed = await bcrypt.hash('PayTest123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `pay${ts}${Math.random().toString(36).slice(2, 8)}@example.com`,
        password_hash: hashed,
        username: `payuser${ts}`,
        full_name: 'Payment Test User',
      },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'PayTest123!@#' });
    token = loginRes.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/payments/stripe/checkout', () => {
    it('devrait retourner 401 sans token', async () => {
      const res = await request(app)
        .post('/api/payments/stripe/checkout')
        .send({
          orderId: 'order-123',
          items: [{ product_id: 'p1', quantity: 1, price: 1000, name: 'Test' }],
          successUrl: 'http://localhost:5173/success',
          cancelUrl: 'http://localhost:5173/cancel',
        });
      expect(res.status).toBe(401);
    });

    it('devrait accepter une requête authentifiée et retourner une structure cohérente ou erreur Stripe', async () => {
      const res = await request(app)
        .post('/api/payments/stripe/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: 'order-123',
          items: [{ product_id: 'p1', quantity: 1, price: 1000, name: 'Produit Test' }],
          successUrl: 'http://localhost:5173/success',
          cancelUrl: 'http://localhost:5173/cancel',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('sessionId');
        expect(res.body.data).toHaveProperty('url');
      } else {
        expect([500, 503]).toContain(res.status);
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe('GET /api/payments/stripe/verify', () => {
    it('devrait retourner 401 sans token', async () => {
      const res = await request(app)
        .get('/api/payments/stripe/verify')
        .query({ sessionId: 'cs_test_xxx' });
      expect(res.status).toBe(401);
    });

    it('devrait accepter une requête authentifiée', async () => {
      const res = await request(app)
        .get('/api/payments/stripe/verify')
        .set('Authorization', `Bearer ${token}`)
        .query({ sessionId: 'cs_test_nonexistent' });

      expect([200, 400, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });
  });
});
