/**
 * Tests d'intégration pour les endpoints /api/auth/register et /api/auth/login
 * Vérifient: statut HTTP, structure JSON, création utilisateur en base, hash du mot de passe
 */
import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import { prisma } from '../../../__tests__/setup.js';

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
  });
});
