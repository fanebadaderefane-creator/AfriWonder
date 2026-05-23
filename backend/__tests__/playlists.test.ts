/**
 * Playlists API
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Playlists API', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    const password = 'Playlist123!@#';
    const hash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email: `playlist-${Date.now()}@example.com`,
        username: `playlistuser${Date.now()}`,
        full_name: 'Playlist User',
        password_hash: hash,
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    // Les PlaylistItem sont supprimés en cascade avec les playlists
    await prisma.playlist.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'playlist-' } },
    });
  });

  it('GET /api/playlists sans auth retourne 401', async () => {
    const res = await request(app).get('/api/playlists');
    expect(res.status).toBe(401);
  });

  it('POST /api/playlists crée une playlist', async () => {
    const res = await request(app)
      .post('/api/playlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ma playlist',
        description: 'Test',
        isPublic: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/playlists retourne les playlists de l’utilisateur', async () => {
    await prisma.playlist.create({
      data: {
        user_id: user.id,
        name: 'Ma playlist',
        description: 'Test',
        is_public: true,
      },
    });

    const res = await request(app)
      .get('/api/playlists')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Le service retourne { playlists, pagination }
    expect(Array.isArray(res.body.data.playlists)).toBe(true);
  });

  it('GET /api/playlists/:id retourne une playlist publique', async () => {
    const playlist = await prisma.playlist.create({
      data: {
        user_id: user.id,
        name: 'Publique',
        description: 'Desc',
        is_public: true,
      },
    });

    const res = await request(app).get(`/api/playlists/${playlist.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

