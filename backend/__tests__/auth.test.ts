import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  let testUser: any;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    // Créer un utilisateur de test avec email unique
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test${testCounter}${Date.now()}@example.com`,
        password_hash: hashedPassword,
        username: `testuser${testCounter}${Date.now()}`,
        full_name: 'Test User'
      }
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'NewPass123!@#',
          username: 'newuser',
          full_name: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('devrait stocker le mot de passe hashé (jamais en clair)', async () => {
      const plainPassword = 'SecretPass456!@#';
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hashcheck@example.com',
          password: plainPassword,
          username: 'hashcheckuser',
          full_name: 'Hash Check User'
        });

      const user = await prisma.user.findUnique({
        where: { email: 'hashcheck@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user!.password_hash).toBeTruthy();
      expect(user!.password_hash).not.toBe(plainPassword);
      const isValidHash = await bcrypt.compare(plainPassword, user!.password_hash);
      expect(isValidHash).toBe(true);
    });

    it('devrait rejeter un email déjà utilisé', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email, // Utiliser l'email de l'utilisateur créé dans beforeEach
          password: 'Test123!@#',
          username: 'anotheruser',
          full_name: 'Another User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('devrait valider les données requises', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      // Attendre que l'utilisateur soit disponible dans la base de données
      let retries = 5;
      while (retries > 0) {
        const user = await prisma.user.findUnique({ where: { id: testUser.id } });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('devrait rejeter un mot de passe incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('devrait rejeter un email inexistant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devrait retourner les informations de l\'utilisateur connecté', async () => {
      // Attendre que l'utilisateur soit disponible dans la base de données
      let retries = 5;
      while (retries > 0) {
        const user = await prisma.user.findUnique({ where: { id: testUser.id } });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      // Se connecter d'abord
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      
      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('devrait rejeter une requête sans token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('devrait rejeter un token invalide', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('devrait rafraîchir le token d\'accès', async () => {
      // Attendre que l'utilisateur soit disponible dans la base de données
      let retries = 5;
      while (retries > 0) {
        const user = await prisma.user.findUnique({ where: { id: testUser.id } });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      // Se connecter d'abord
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('refreshToken');
      
      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('devrait rejeter un refresh token invalide', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        });

      expect(response.status).toBe(401);
    });
  });
});

