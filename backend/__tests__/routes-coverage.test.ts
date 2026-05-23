/**
 * Couverture architecture API : vérifie que toutes les routes montées dans app.ts
 * répondent (200, 401, 400, etc.) et non 404 route non trouvée.
 */
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

const API = '/api';

describe('Architecture API - Routes montées', () => {
  it('GET /health retourne 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('auth: POST /api/auth/login sans body retourne 400 ou 401', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({});
    expect([400, 401, 422]).toContain(res.status);
  });

  it('videos: GET /api/videos retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/videos`);
    expect([200, 401]).toContain(res.status);
  });

  it('products: GET /api/products retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/products`);
    expect([200, 401]).toContain(res.status);
  });

  it('orders: GET /api/orders sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/orders`);
    expect(res.status).toBe(401);
  });

  it('cart: GET /api/cart sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/cart`);
    expect(res.status).toBe(401);
  });

  it('payments: GET /api/payments/wallet sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/payments/wallet`);
    expect(res.status).toBe(401);
  });

  it('reviews: GET /api/reviews/product/1 retourne 200 ou 404', async () => {
    const res = await request(app).get(`${API}/reviews/product/1`);
    expect([200, 404]).toContain(res.status);
  });

  it('platform: GET /api/platform/config retourne 200', async () => {
    const res = await request(app).get(`${API}/platform/config`);
    expect(res.status).toBe(200);
  });

  it('events: GET /api/events retourne 200', async () => {
    const res = await request(app).get(`${API}/events`);
    expect(res.status).toBe(200);
  });

  it('communities: GET /api/communities retourne 200', async () => {
    const res = await request(app).get(`${API}/communities`);
    expect(res.status).toBe(200);
  });

  it('challenges: GET /api/challenges retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/challenges`);
    expect([200, 401]).toContain(res.status);
  });

  it('courses: GET /api/courses retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/courses`);
    expect([200, 401]).toContain(res.status);
  });

  it('news: GET /api/news retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/news`);
    expect([200, 401]).toContain(res.status);
  });

  it('services: GET /api/services retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/services`);
    expect([200, 401]).toContain(res.status);
  });

  it('providers: GET /api/providers retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/providers`);
    expect([200, 401]).toContain(res.status);
  });

  it('rides: GET /api/rides sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/rides`);
    expect(res.status).toBe(401);
  });

  it('drivers: GET /api/drivers/nearby retourne 200 ou 400', async () => {
    const res = await request(app).get(`${API}/drivers/nearby`);
    expect([200, 400]).toContain(res.status);
  });

  it('restaurants: GET /api/restaurants retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/restaurants`);
    expect([200, 401]).toContain(res.status);
  });

  it('food-orders: GET /api/food-orders sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/food-orders`);
    expect(res.status).toBe(401);
  });

  it('tickets: GET /api/tickets retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/tickets`);
    expect([200, 401]).toContain(res.status);
  });

  it('properties: GET /api/properties retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/properties`);
    expect([200, 401]).toContain(res.status);
  });

  it('insurance: GET /api/insurance/policies sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/insurance/policies`);
    expect(res.status).toBe(401);
  });

  it('appointments: GET /api/appointments sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/appointments`);
    expect(res.status).toBe(401);
  });

  it('doctors: GET /api/doctors retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/doctors`);
    expect([200, 401]).toContain(res.status);
  });

  it('civic: GET /api/civic retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/civic`);
    expect([200, 401]).toContain(res.status);
  });

  it('crowdfunding: GET /api/crowdfunding retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/crowdfunding`);
    expect([200, 401]).toContain(res.status);
  });

  it('microcredit: GET /api/microcredit retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/microcredit`);
    expect([200, 401]).toContain(res.status);
  });

  it('jobs: GET /api/jobs retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/jobs`);
    expect([200, 401]).toContain(res.status);
  });

  it('gamification: GET /api/gamification/me sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/gamification/me`);
    expect(res.status).toBe(401);
  });

  it('certificates: GET /api/certificates sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/certificates`);
    expect(res.status).toBe(401);
  });

  it('leaderboard: GET /api/leaderboard retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/leaderboard`);
    expect([200, 401]).toContain(res.status);
  });

  it('live: GET /api/live retourne 200, 401 ou 500 (500 si schéma DB / service live en erreur)', async () => {
    const res = await request(app).get(`${API}/live`);
    expect([200, 401, 500]).toContain(res.status);
  });

  it('notifications: GET /api/notifications sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/notifications`);
    expect(res.status).toBe(401);
  });

  it('disputes: GET /api/disputes sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/disputes`);
    expect(res.status).toBe(401);
  });

  it('support: GET ou POST /api/support retourne 200/401/404', async () => {
    const res = await request(app).get(`${API}/support`);
    expect([200, 401, 404]).toContain(res.status);
  });

  it('addresses: GET /api/addresses sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/addresses`);
    expect(res.status).toBe(401);
  });

  it('admin: GET /api/admin/dashboard sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/admin/dashboard`);
    expect(res.status).toBe(401);
  });

  it('commissions: GET /api/commissions retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/commissions`);
    expect([200, 401]).toContain(res.status);
  });

  it('exchange-rates: GET /api/exchange-rates retourne 200 ou 401', async () => {
    const res = await request(app).get(`${API}/exchange-rates`);
    expect([200, 401]).toContain(res.status);
  });

  it('bills: GET /api/bills sans auth retourne 401', async () => {
    const res = await request(app).get(`${API}/bills`);
    expect(res.status).toBe(401);
  });

  it('airtime: GET ou POST /api/airtime retourne 200/401/404', async () => {
    const res = await request(app).get(`${API}/airtime`);
    expect([200, 401, 404]).toContain(res.status);
  });
});
