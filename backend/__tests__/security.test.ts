/**
 * QA - Securite: auth requise, anti-bot, validation
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Securite API', () => {
  let token: string;
  let testUser: any;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    testUser = await prisma.user.create({
      data: {
        email: `sec${Date.now()}@example.com`,
        password_hash: hashed,
        username: `secuser${Date.now()}`,
        full_name: 'Security Test',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe('Auth requise', () => {
    it('GET /api/auth/me sans token retourne 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
    it('GET /api/cart sans token retourne 401', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
    });
  });

  describe('Validation register', () => {
    it('email invalide retourne 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-email', password: 'Valid1!@#', username: 'u', full_name: 'U' });
      expect(res.status).toBe(400);
    });
  });

  describe('Anti-bot', () => {
    it('User-Agent bot retourne 403', async () => {
      const res = await request(app).get('/api/videos').set('User-Agent', 'Googlebot/2.1');
      expect(res.status).toBe(403);
    });
  });
});
