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
        role: 'admin',
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
});
