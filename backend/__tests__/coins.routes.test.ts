import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from './setup.js';

async function withRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 200): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

describe('Coins API', () => {
  jest.setTimeout(120_000);
  let user: any;
  let token = '';

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Coins123!@#', 10);
    user = await withRetry(() =>
      prisma.user.create({
      data: {
        email: `coins${Date.now()}@example.com`,
        password_hash: hashed,
        username: `coinsuser${Date.now()}`,
        full_name: 'Coins User',
      },
    })
    );
    token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { reference_id: { startsWith: 'coins:' } },
          { description: { contains: 'Achat coins' } },
        ],
      },
    }).catch(() => {});
    await prisma.transaction.deleteMany({
      where: { OR: [{ reference_id: { startsWith: 'coins:' } }, { user_id: user?.id, type: 'coins_purchase' }] },
    }).catch(() => {});
    await prisma.wallet.deleteMany({ where: { user_id: user?.id, wallet_type: 'coins' } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user?.id } }).catch(() => {});
  });

  it('GET /api/coins/packages', async () => {
    const res = await request(app).get('/api/coins/packages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.packages)).toBe(true);
    expect(res.body.data.packages.length).toBeGreaterThan(0);
  });

  it('GET /api/coins/balance', async () => {
    const res = await request(app)
      .get('/api/coins/balance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.coins_balance).toBe('number');
  });

  it('POST /api/coins/purchase', async () => {
    const res = await request(app)
      .post('/api/coins/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        packageId: 'coins-100',
        payment_method: 'wave',
        returnUrl: 'https://afriwonder.com/coins/complete',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference_id).toContain('coins:coins-100:');
  });

  it('POST /api/coins/purchase/confirm credits real coins balance', async () => {
    const purchase = await request(app)
      .post('/api/coins/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        packageId: 'coins-500',
        payment_method: 'wave',
        returnUrl: 'https://afriwonder.com/coins/complete',
      });
    const referenceId = purchase.body.data.reference_id;

    const confirm = await request(app)
      .post('/api/coins/purchase/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ referenceId });

    expect(confirm.status).toBe(200);
    expect(confirm.body.success).toBe(true);
    expect(confirm.body.data.coins_balance).toBeGreaterThanOrEqual(525);

    const balance = await request(app)
      .get('/api/coins/balance')
      .set('Authorization', `Bearer ${token}`);

    expect(balance.status).toBe(200);
    expect(balance.body.data.coins_balance).toBeGreaterThanOrEqual(525);
  });
});
