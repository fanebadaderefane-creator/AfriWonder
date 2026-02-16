import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

const TEST_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';

describe('Admin logistics routes', () => {
  let adminToken = '';
  let userToken = '';
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;

    await prisma.shippingRate.deleteMany();
    await prisma.pickupPoint.deleteMany();
    await prisma.adminLog.deleteMany();

    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const passwordHash = await bcrypt.hash('AdminLog123!@#', 10);
    const unique = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const admin = await prisma.user.create({
      data: {
        email: TEST_ADMIN_EMAIL,
        username: `admin_log_${unique}`,
        password_hash: passwordHash,
        full_name: 'Admin Logistics',
        role: 'admin',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `user-log-${unique}@example.com`,
        username: `user_log_${unique}`,
        password_hash: passwordHash,
        full_name: 'User Logistics',
      },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'AdminLog123!@#' });
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'AdminLog123!@#' });
    userToken = userLogin.body.data.accessToken;
  });

  it('denies non-admin access', async () => {
    const res = await request(app)
      .get('/api/admin/logistics/rates')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to create and update shipping rate', async () => {
    const created = await request(app)
      .post('/api/admin/logistics/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        provider: 'DHL Mali',
        destination_country: 'ML',
        base_cost: 1000,
        cost_per_kg: 200,
        estimated_delivery_days: 3,
      });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data.provider).toBe('DHL Mali');

    const id = created.body.data.id;
    const updated = await request(app)
      .put(`/api/admin/logistics/rates/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cost_per_kg: 250,
        is_active: false,
      });

    expect(updated.status).toBe(200);
    expect(updated.body.success).toBe(true);
    expect(updated.body.data.cost_per_kg).toBe(250);
    expect(updated.body.data.is_active).toBe(false);
  });

  it('allows admin to create and list pickup points', async () => {
    const created = await request(app)
      .post('/api/admin/logistics/pickup-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Point ACI',
        address: 'ACI 2000',
        city: 'Bamako',
        country: 'ML',
      });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const list = await request(app)
      .get('/api/admin/logistics/pickup-points?country=ML')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it('returns consolidated providers payload', async () => {
    await prisma.shippingRate.create({
      data: {
        provider: 'Transport Local',
        destination_country: 'ML',
        base_cost: 800,
        cost_per_kg: 120,
        estimated_delivery_days: 2,
        is_active: true,
      },
    });
    await prisma.pickupPoint.create({
      data: {
        name: 'Point Sogoniko',
        address: 'Sogoniko Gare',
        city: 'Bamako',
        country: 'ML',
        is_active: true,
      },
    });

    const res = await request(app)
      .get('/api/admin/logistics/providers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.providers)).toBe(true);
    expect(Array.isArray(res.body.data.pickup_points)).toBe(true);
    expect(res.body.data.providers.length).toBeGreaterThan(0);
    expect(res.body.data.pickup_points.length).toBeGreaterThan(0);
  });
});
