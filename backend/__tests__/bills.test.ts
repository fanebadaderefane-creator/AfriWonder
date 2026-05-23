/**
 * Bills API — historique et paiement de factures
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Bills API', () => {
  let user: any;
  let token: string;
  const ts = Date.now();

  beforeEach(async () => {
    const email = `bills${ts}${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'BillsTest123!@#';
    const passwordHash = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email,
        username: `billsuser${ts}`,
        full_name: 'Bills Test User',
        password_hash: passwordHash,
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    token = loginRes.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.billPayment.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'bills' },
      },
    });
  });

  describe('GET /api/bills', () => {
    it('retourne 401 sans authentification', async () => {
      const res = await request(app).get('/api/bills');
      expect(res.status).toBe(401);
    });

    it('retourne l’historique des factures de l’utilisateur authentifié', async () => {
      // Seed quelques paiements
      await prisma.billPayment.createMany({
        data: [
          {
            user_id: user.id,
            bill_type: 'electricity',
            provider: 'EDM',
            account_number: 'ACC123',
            customer_name: 'Test User',
            amount: 10000,
            payment_method: 'wallet',
            status: 'completed',
            fees: 0,
          },
          {
            user_id: user.id,
            bill_type: 'water',
            provider: 'SOMAGEP',
            account_number: 'ACC456',
            customer_name: 'Test User',
            amount: 5000,
            payment_method: 'wallet',
            status: 'pending',
            fees: 100,
          },
        ],
      });

      const res = await request(app)
        .get('/api/bills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/bills/pay', () => {
    it('retourne 401 sans authentification', async () => {
      const res = await request(app)
        .post('/api/bills/pay')
        .send({
          bill_type: 'electricity',
          provider: 'EDM',
          account_number: 'ACC123',
          amount: 10000,
        });
      expect(res.status).toBe(401);
    });

    it('valide les champs requis et retourne 400 si manquants', async () => {
      const res = await request(app)
        .post('/api/bills/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // bill_type manquant
          provider: 'EDM',
          account_number: 'ACC123',
          amount: 10000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('crée un paiement de facture et retourne 201', async () => {
      const payload = {
        bill_type: 'electricity',
        provider: 'EDM',
        account_number: 'ACC123',
        customer_name: 'Test User',
        amount: 12345,
        payment_method: 'wallet',
        due_date: new Date().toISOString(),
        bill_period: '2025-01',
        fees: 200,
      };

      const res = await request(app)
        .post('/api/bills/pay')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        bill_type: payload.bill_type,
        provider: payload.provider,
        account_number: payload.account_number,
        amount: payload.amount,
        payment_method: payload.payment_method,
      });

      const inDb = await prisma.billPayment.findMany({
        where: { user_id: user.id, account_number: 'ACC123' },
      });
      expect(inDb.length).toBe(1);
    });
  });

  describe('GET /api/bills/payments', () => {
    it('retourne 401 sans authentification', async () => {
      const res = await request(app).get('/api/bills/payments');
      expect(res.status).toBe(401);
    });

    it('retourne les paiements paginés pour l’utilisateur', async () => {
      await prisma.billPayment.createMany({
        data: Array.from({ length: 3 }).map((_, i) => ({
          user_id: user.id,
          bill_type: 'internet',
          provider: 'ISP',
          account_number: `ACC${i}`,
          amount: 1000 + i * 100,
          payment_method: 'wallet',
          status: 'completed',
          fees: 0,
        })),
      });

      const res = await request(app)
        .get('/api/bills/payments')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('payments');
      expect(res.body.data).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data.payments)).toBe(true);
      expect(res.body.data.payments.length).toBeLessThanOrEqual(2);
    });
  });
});

