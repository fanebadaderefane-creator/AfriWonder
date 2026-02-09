/**
 * Tests d'intégration pour les endpoints /api/payments/*
 * Vérifient: authentification requise, structure des réponses, logique métier
 */
import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import { prisma } from '../../../__tests__/setup.js';

describe('Payments routes', () => {
  let authToken: string;
  let userId: string;
  const timestamp = Date.now();
  const unique = `pay${timestamp}`;

  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: `${unique}@example.com` },
    });

    const passwordHash = await bcrypt.hash('PayTest123!', 10);
    const user = await prisma.user.create({
      data: {
        email: `${unique}@example.com`,
        username: `user_${unique}`,
        password_hash: passwordHash,
        full_name: 'Payment Test User',
      },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `${unique}@example.com`, password: 'PayTest123!' })
      .expect(200);
    authToken = loginRes.body.data.accessToken;
  });

  describe('POST /api/payments/stripe/checkout', () => {
    it('returns 401 without authentication', async () => {
      await request(app)
        .post('/api/payments/stripe/checkout')
        .send({
          orderId: 'ord_test_1',
          items: [{ product_id: 'p1', quantity: 1, price: 1000, name: 'Test' }],
          successUrl: 'http://localhost:5173/success',
          cancelUrl: 'http://localhost:5173/cancel',
        })
        .expect(401);
    });

    it('with auth returns 200 with sessionId when Stripe configured, or 500 otherwise', async () => {
      const res = await request(app)
        .post('/api/payments/stripe/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: `ord_${userId}`,
          items: [{ product_id: 'p1', quantity: 1, price: 1000, name: 'Test Product' }],
          successUrl: 'http://localhost:5173/success',
          cancelUrl: 'http://localhost:5173/cancel',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.sessionId).toBeDefined();
      } else {
        expect([500, 503]).toContain(res.status);
      }
    });
  });

  describe('GET /api/payments/stripe/verify', () => {
    it('returns 401 without authentication', async () => {
      await request(app)
        .get('/api/payments/stripe/verify?sessionId=cs_test_xxx')
        .expect(401);
    });

    it('with auth returns 200 or 4xx/5xx depending on session', async () => {
      const res = await request(app)
        .get('/api/payments/stripe/verify?sessionId=cs_invalid_test')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });
});
