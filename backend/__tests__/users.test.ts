import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Users API', () => {
  let testUser: any;
  let authToken: string;
  let otherUser: any;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    const timestamp = Date.now();
    // Créer un utilisateur de test avec email unique
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test${testCounter}${timestamp}@example.com`,
        password_hash: hashedPassword,
        username: `testuser${testCounter}${timestamp}`,
        full_name: 'Test User'
      }
    });

    // Créer un autre utilisateur
    otherUser = await prisma.user.create({
      data: {
        email: `other${testCounter}${timestamp}@example.com`,
        password_hash: hashedPassword,
        username: `otheruser${testCounter}${timestamp}`,
        full_name: 'Other User'
      }
    });

    // Attendre que l'utilisateur soit disponible dans la base de données
    let retries = 5;
    while (retries > 0) {
      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      if (user) break;
      await new Promise(resolve => setTimeout(resolve, 50));
      retries--;
    }

    // Se connecter pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'Test123!@#'
      });

    // Vérifier que le login a réussi
    if (loginResponse.status !== 200 || !loginResponse.body.data?.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.data.accessToken;
  });

  afterEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/users/:id', () => {
    it('devrait retourner les informations d\'un utilisateur', async () => {
      // Attendre que l'utilisateur soit disponible
      let retries = 5;
      while (retries > 0) {
        const user = await prisma.user.findUnique({ where: { id: otherUser.id } });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(otherUser.id);
      expect(response.body.data.email).toBe(otherUser.email);
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users/:id/follow', () => {
    it('devrait suivre un utilisateur', async () => {
      // Attendre que les deux utilisateurs soient disponibles
      let retries = 5;
      while (retries > 0) {
        const user1 = await prisma.user.findUnique({ where: { id: testUser.id } });
        const user2 = await prisma.user.findUnique({ where: { id: otherUser.id } });
        if (user1 && user2) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      const response = await request(app)
        .post(`/api/users/${otherUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toBe(true);
    });

    it('devrait unfollow un utilisateur déjà suivi', async () => {
      // Attendre que les deux utilisateurs soient disponibles
      let retries = 5;
      while (retries > 0) {
        const user1 = await prisma.user.findUnique({ where: { id: testUser.id } });
        const user2 = await prisma.user.findUnique({ where: { id: otherUser.id } });
        if (user1 && user2) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      // Suivre d'abord
      await request(app)
        .post(`/api/users/${otherUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      // Unfollow
      const response = await request(app)
        .post(`/api/users/${otherUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.following).toBe(false);
    });

    it('ne devrait pas permettre de se suivre soi-même', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:id/followers', () => {
    it('devrait retourner la liste des followers', async () => {
      // Attendre que les deux utilisateurs soient disponibles
      let retries = 5;
      while (retries > 0) {
        const user1 = await prisma.user.findUnique({ where: { id: testUser.id } });
        const user2 = await prisma.user.findUnique({ where: { id: otherUser.id } });
        if (user1 && user2) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      // Créer un follow d'abord
      await prisma.follow.create({
        data: {
          follower_id: testUser.id,
          following_id: otherUser.id
        }
      });

      const response = await request(app)
        .get(`/api/users/${otherUser.id}/followers`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('followers');
      expect(Array.isArray(response.body.data.followers)).toBe(true);
    });
  });

  describe('GET /api/users/:id/following', () => {
    it('devrait retourner la liste des utilisateurs suivis', async () => {
      // Attendre que les deux utilisateurs soient disponibles
      let retries = 5;
      while (retries > 0) {
        const user1 = await prisma.user.findUnique({ where: { id: testUser.id } });
        const user2 = await prisma.user.findUnique({ where: { id: otherUser.id } });
        if (user1 && user2) break;
        await new Promise(resolve => setTimeout(resolve, 50));
        retries--;
      }

      // Créer un follow d'abord
      await prisma.follow.create({
        data: {
          follower_id: testUser.id,
          following_id: otherUser.id
        }
      });

      const response = await request(app)
        .get(`/api/users/${testUser.id}/following`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('following');
      expect(Array.isArray(response.body.data.following)).toBe(true);
    });
  });
});

