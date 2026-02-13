/**
 * Parcours critique (smoke) — à lancer avant chaque déploiement.
 * Vérifie en ~30 s : health, auth, API de base (videos, cart, orders config).
 * Pas besoin de tout tester à la main : si ce fichier passe, le cœur de l'app fonctionne.
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('Smoke — Parcours critique', () => {
  let token: string;
  let testUser: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Smoke123!@#', 10);
    testUser = await prisma.user.create({
      data: {
        email: `smoke${Date.now()}@example.com`,
        password_hash: hashed,
        username: `smoke${Date.now()}`,
        full_name: 'Smoke User',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'smoke' } } }).catch(() => {});
  });

  it('1. Health OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('2. Health ready (DB)', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('connected');
  });

  it('3. Register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `new${Date.now()}@example.com`,
        password: 'NewPass123!@#',
        username: `newuser${Date.now()}`,
        full_name: 'New User',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('4. Login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'Smoke123!@#' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    token = res.body.data.accessToken;
  });

  it('5. Me (auth)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('6. Videos list', async () => {
    const res = await request(app).get('/api/videos').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('videos');
  });

  it('7. Cart (auth)', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
  });

  it('8. Orders config (public)', async () => {
    const res = await request(app).get('/api/orders/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('cancellation_deadline_hours');
  });

  it('9. Products list', async () => {
    const res = await request(app).get('/api/products').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('products');
  });

  it('10. Webhook payload validation', async () => {
    const res = await request(app)
      .post('/api/payment/webhook')
      .send({ provider: 'orange_money', status: 'SUCCESS' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
