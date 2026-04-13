/**
 * QA - Admin: dashboard et routes protegees
 * requireAnyAdmin exige email = SUPER_ADMIN_EMAIL + rôle admin. On utilise un email de test aligné avec CI.
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

const TEST_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';

describe('Admin API', () => {
  let adminUser: any;
  let normalUser: any;
  let adminToken: string;
  let normalToken: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    adminUser = await prisma.user.create({
      data: {
        email: TEST_ADMIN_EMAIL,
        password_hash: hashed,
        username: `admin${Date.now()}`,
        full_name: 'Admin User',
        role: 'super_admin',
      },
    });
    normalUser = await prisma.user.create({
      data: {
        email: `norm${Date.now()}@example.com`,
        password_hash: hashed,
        username: `norm${Date.now()}`,
        full_name: 'Normal User',
        role: 'user',
      },
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: 'Test123!@#' });
    adminToken = adminLogin.body.data?.accessToken || '';
    const normLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: normalUser.email, password: 'Test123!@#' });
    normalToken = normLogin.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe('GET /api/admin/dashboard', () => {
    it('admin peut acceder au dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stats?.productionReadiness).toBe(100);
    });

    it('utilisateur non admin recoit 403', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.status).toBe(403);
    });

    it('sans token retourne 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/users', () => {
    it('admin peut lister les utilisateurs', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users');
    });
  });

  describe('Admin mobile aggregates', () => {
    it('GET /api/admin/analytics/overview retourne les alertes agrégées', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('alerts');
      expect(res.body.data.alerts).toHaveProperty('pending_reports');
      expect(res.body.data.alerts).toHaveProperty('pending_withdrawals');
      expect(res.body.data.alerts).toHaveProperty('active_lives');
    });

    it('GET /api/admin/analytics/users retourne inscriptions et actifs sur la période', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/users?period=7d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('new_signups');
      expect(res.body.data).toHaveProperty('active_users');
      expect(res.body.data).toHaveProperty('period');
    });

    it('GET /api/admin/analytics/revenue retourne le CA marketplace sur la période', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/revenue?period=30d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('marketplace_revenue_fcfa');
      expect(res.body.data).toHaveProperty('completed_orders');
      expect(res.body.data).toHaveProperty('by_payment_method');
    });

    it('GET /api/admin/analytics/content retourne volumes vidéos et lives', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/content?period=7d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('videos_uploaded');
      expect(res.body.data).toHaveProperty('lives_started_in_period');
      expect(res.body.data).toHaveProperty('lives_live_now');
    });

    it('GET /api/admin/settings retourne le snapshot admin', async () => {
      const res = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('killSwitch');
      expect(res.body.data).toHaveProperty('featureFlags');
      expect(res.body.data).toHaveProperty('commissions');
    });

    it('GET /api/admin/lives/active retourne la liste des lives actifs', async () => {
      const res = await request(app)
        .get('/api/admin/lives/active')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('streams');
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('GET /api/admin/transactions/export retourne un CSV', async () => {
      const res = await request(app)
        .get('/api/admin/transactions/export')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(String(res.headers['content-type'])).toContain('text/csv');
      expect(String(res.text)).toContain('"id"');
    });

    it('POST /api/admin/broadcast-notification crée des notifications in-app', async () => {
      const res = await request(app)
        .post('/api/admin/broadcast-notification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bienvenue',
          body: 'Bienvenue sur AfriWonder !',
          target: 'all',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delivered).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/admin/monitoring/e2ee', () => {
    it('admin peut consulter le monitoring e2ee', async () => {
      const res = await request(app)
        .get('/api/admin/monitoring/e2ee')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('devices_registered');
      expect(res.body.data).toHaveProperty('prekeys_available');
      expect(res.body.data).toHaveProperty('alerts');
      expect(Array.isArray(res.body.data.alerts)).toBe(true);
    });
  });
});
