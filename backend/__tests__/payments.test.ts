/**
 * QA — Paiements : webhook payload, wallet, transactions (sans appels réels providers)
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Payments API', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `pay${Date.now()}@example.com`,
        password_hash: hashed,
        username: `payuser${Date.now()}`,
        full_name: 'Pay User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/payment/webhook', () => {
    it('devrait exiger orderId ou reference', async () => {
      const res = await request(app)
        .post('/api/payment/webhook')
        .send({ provider: 'orange_money', status: 'SUCCESS' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/orderId|reference/i);
    });

    it('devrait accepter un payload valide et retourner 200', async () => {
      const res = await request(app)
        .post('/api/payment/webhook')
        .send({
          provider: 'orange_money',
          orderId: 'fake-order-id',
          status: 'SUCCESS',
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('received', true);
    });

    it('status non success ne devrait pas traiter', async () => {
      const res = await request(app)
        .post('/api/payment/webhook')
        .send({
          provider: 'orange_money',
          orderId: 'any',
          status: 'PENDING',
        });
      expect(res.status).toBe(200);
      expect(res.body.processed).toBe(false);
    });
  });

  describe('GET /api/payments/wallet', () => {
    it('devrait retourner le wallet ou en créer un', async () => {
      const res = await request(app)
        .get('/api/payments/wallet')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('balance');
      expect(res.body.data).toHaveProperty('available_balance');
    });
  });

  describe('GET /api/payments/transactions', () => {
    it('devrait retourner la liste des transactions', async () => {
      const res = await request(app)
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
