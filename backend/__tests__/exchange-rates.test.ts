/**
 * Exchange rates API — taux de change et conversion
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

const TEST_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';

describe('Exchange rates API', () => {
  let userToken: string;
  let adminToken: string;
  const ts = Date.now();

  beforeEach(async () => {
    const base = `rexch${ts}${Math.random().toString(36).slice(2, 6)}`;
    const password = 'RateTest123!@#';
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        email: TEST_ADMIN_EMAIL,
        username: `${base}-admin`,
        full_name: 'Admin User',
        password_hash: passwordHash,
        role: 'admin',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `${base}-user@example.com`,
        username: `${base}-user`,
        full_name: 'Normal User',
        password_hash: passwordHash,
        role: 'user',
      },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password });
    adminToken = adminLogin.body.data?.accessToken || '';

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    userToken = userLogin.body.data?.accessToken || '';

    await prisma.exchangeRate.deleteMany({});
  });

  afterEach(async () => {
    await prisma.exchangeRate.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'rexch' },
      },
    });
  });

  describe('GET /api/exchange-rates', () => {
    it('retourne une liste de taux et peut créer un taux par défaut', async () => {
      const res = await request(app).get('/api/exchange-rates');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/exchange-rates/convert', () => {
    it('convertit un montant avec les paramètres de requête', async () => {
      const res = await request(app)
        .get('/api/exchange-rates/convert')
        .query({ amount: 100, from: 'EUR', to: 'XOF' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('amount');
      expect(res.body.data).toHaveProperty('converted');
    });
  });

  describe('PUT /api/exchange-rates/rates', () => {
    it('retourne 401 sans authentification', async () => {
      const res = await request(app)
        .put('/api/exchange-rates/rates')
        .send({ from_currency: 'EUR', to_currency: 'XOF', rate: 650 });
      expect(res.status).toBe(401);
    });

    it('retourne 403 pour un utilisateur non admin', async () => {
      const res = await request(app)
        .put('/api/exchange-rates/rates')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ from_currency: 'EUR', to_currency: 'XOF', rate: 650 });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('permet à un admin de définir un taux de change', async () => {
      const res = await request(app)
        .put('/api/exchange-rates/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ from_currency: 'EUR', to_currency: 'XOF', rate: 650 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        from_currency: 'EUR',
        to_currency: 'XOF',
      });

      const row = await prisma.exchangeRate.findUnique({
        where: {
          from_currency_to_currency: {
            from_currency: 'EUR',
            to_currency: 'XOF',
          },
        },
      });
      expect(row).toBeTruthy();
      expect(row!.rate).toBe(650);
    });
  });
});

