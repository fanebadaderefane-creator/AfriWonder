import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Videos API', () => {
  let testUser: any;
  let authToken: string;
  let testVideo: any;
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

    // Créer une vidéo de test seulement si le login a réussi
    if (authToken && testUser.id) {
      testVideo = await prisma.video.create({
        data: {
          title: 'Test Video',
          description: 'Test Description',
          video_url: 'https://cdn.afriwonder.com/video.mp4',
          thumbnail_url: 'https://cdn.afriwonder.com/thumb.jpg',
          creator_id: testUser.id,
          visibility: 'public',
          category: 'entertainment'
        }
      });
    }
  });

  afterEach(async () => {
    await prisma.video.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/videos', () => {
    it('devrait retourner la liste des vidéos publiques', async () => {
      const response = await request(app)
        .get('/api/videos')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('videos');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.videos)).toBe(true);
    });

    it('ne devrait pas retourner les vidéos avec example.com', async () => {
      const response = await request(app)
        .get('/api/videos')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      const videos = response.body.data.videos;
      const hasExampleVideos = videos.some((v: any) => 
        v.video_url?.includes('example.com')
      );
      expect(hasExampleVideos).toBe(false);
    });

    it('devrait supporter la pagination', async () => {
      const response = await request(app)
        .get('/api/videos')
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/videos/:id', () => {
    it('devrait retourner les détails d\'une vidéo', async () => {
      const response = await request(app)
        .get(`/api/videos/${testVideo.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testVideo.id);
      expect(response.body.data.title).toBe('Test Video');
    });

    it('devrait retourner 404 pour une vidéo inexistante', async () => {
      const response = await request(app)
        .get('/api/videos/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/videos', () => {
    it('devrait créer une nouvelle vidéo', async () => {
      const response = await request(app)
        .post('/api/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Video',
          description: 'New Description',
          video_url: 'https://cdn.afriwonder.com/video.mp4',
          thumbnail_url: 'https://cdn.afriwonder.com/thumb.jpg',
          visibility: 'public',
          category: 'entertainment'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Video');
      expect(response.body.data.creator_id).toBe(testUser.id);
    });

    it('devrait rejeter une vidéo sans titre', async () => {
      const response = await request(app)
        .post('/api/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Description only',
          video_url: 'https://cdn.afriwonder.com/video.mp4'
        });

      expect(response.status).toBe(400);
    });

    it('devrait rejeter une requête non authentifiée', async () => {
      const response = await request(app)
        .post('/api/videos')
        .send({
          title: 'New Video',
          video_url: 'https://cdn.afriwonder.com/video.mp4'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/videos/:id/like', () => {
    it('devrait liker une vidéo', async () => {
      const response = await request(app)
        .post(`/api/videos/${testVideo.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.liked).toBe(true);
    });

    it('devrait unliker une vidéo déjà likée', async () => {
      // Liker d'abord
      await request(app)
        .post(`/api/videos/${testVideo.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      // Unliker
      const response = await request(app)
        .post(`/api/videos/${testVideo.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.liked).toBe(false);
    });
  });

  describe('POST /api/videos/:id/comment', () => {
    it('devrait ajouter un commentaire', async () => {
      const response = await request(app)
        .post(`/api/videos/${testVideo.id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Great video!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Great video!');
    });

    it('devrait rejeter un commentaire vide', async () => {
      const response = await request(app)
        .post(`/api/videos/${testVideo.id}/comment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: ''
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/videos/:id/comments', () => {
    it('devrait retourner les commentaires d\'une vidéo', async () => {
      // Créer un commentaire d'abord
      await prisma.comment.create({
        data: {
          video_id: testVideo.id,
          user_id: testUser.id,
          content: 'Test comment',
          user_name: testUser.full_name,
          user_avatar: testUser.profile_image
        }
      });

      const response = await request(app)
        .get(`/api/videos/${testVideo.id}/comments`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data.comments.length).toBeGreaterThan(0);
    });
  });
});

