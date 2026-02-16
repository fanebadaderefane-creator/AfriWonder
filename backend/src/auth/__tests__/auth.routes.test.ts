/**
 * Tests d'intégration pour les endpoints /api/auth/register et /api/auth/login
 * Vérifient: statut HTTP, structure JSON, création utilisateur en base, hash du mot de passe
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import app from '../../app.js';
import { prisma } from '../../../__tests__/setup.js';

// Aligner les secrets JWT avec le middleware auth (comme ads.test / autres tests d’intégration)
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_auth_routes';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_for_auth_routes';
});

describe('Auth routes', () => {
  const timestamp = Date.now();
  const unique = `auth${timestamp}`;
  const validUser = {
    email: `${unique}@example.com`,
    username: `user_${unique}`,
    password: 'ValidPass123!',
    full_name: 'Test User',
  };

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: validUser.email }, { username: validUser.username }],
      },
    });
  });

  describe('POST /api/auth/register', () => {
    it('returns 201 and creates user with hashed password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: validUser.email,
            username: validUser.username,
            full_name: validUser.full_name,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.user.id).toBeDefined();

      const created = await prisma.user.findUnique({
        where: { email: validUser.email },
      });
      expect(created).toBeTruthy();
      expect(created!.password_hash).toBeDefined();
      const match = await bcrypt.compare(validUser.password, created!.password_hash);
      expect(match).toBe(true);
    });

    it('returns 400 when email already used', async () => {
      await request(app).post('/api/auth/register').send(validUser).expect(201);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: validUser.email, username: `other_${unique}` })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/déjà utilisé|already/i);
    });

    it('returns 400 when required fields missing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: validUser.email })
        .expect(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'not-an-email' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser).expect(201);
    });

    it('returns 200 with tokens and user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: validUser.email,
            username: validUser.username,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'WrongPassword1!' })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: validUser.password })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when 2FA enabled and code missing', async () => {
      let user = await prisma.user.findUnique({ where: { email: validUser.email } });
      if (!user) {
        await request(app).post('/api/auth/register').send(validUser).expect(201);
        user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
      }
      const secret = speakeasy.generateSecret({ name: 'AfriWonder', length: 32 }).base32;
      await prisma.user2FA.upsert({
        where: { user_id: user.id },
        update: {
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
        create: {
          user_id: user.id,
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(401);

      expect(res.body.success).toBe(false);
      const message = res.body?.error?.message || res.body?.message || '';
      expect(String(message).toLowerCase()).toContain('2fa');
    });

    it('returns 401 when 2FA enabled and code invalid', async () => {
      let user = await prisma.user.findUnique({ where: { email: validUser.email } });
      if (!user) {
        await request(app).post('/api/auth/register').send(validUser).expect(201);
        user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
      }
      const secret = speakeasy.generateSecret({ name: 'AfriWonder', length: 32 }).base32;
      await prisma.user2FA.upsert({
        where: { user_id: user.id },
        update: {
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
        create: {
          user_id: user.id,
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password, twoFactorCode: '000000' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 200 when 2FA enabled and TOTP code valid', async () => {
      let user = await prisma.user.findUnique({ where: { email: validUser.email } });
      if (!user) {
        await request(app).post('/api/auth/register').send(validUser).expect(201);
        user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
      }
      const secret = speakeasy.generateSecret({ name: 'AfriWonder', length: 32 }).base32;
      await prisma.user2FA.upsert({
        where: { user_id: user.id },
        update: {
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
        create: {
          user_id: user.id,
          method: 'authenticator',
          is_enabled: true,
          secret,
          backup_codes: ['BACKUP123'],
        },
      });

      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password, twoFactorCode: code })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.two_factor_verified).toBe(true);
    });
  });
});
