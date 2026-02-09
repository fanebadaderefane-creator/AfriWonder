/**
 * QA — SOCIAL & CONTENU: Saves (vidéos sauvegardées) / playlists
 * GET /api/saves, POST /api/saves (toggle save)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Saves API (saved videos)', () => {
  let token: string;
  let user: any;
  let video: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Save123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `save${Date.now()}@example.com`,
        password_hash: hashed,
        username: `saveuser${Date.now()}`,
        full_name: 'Save User',
      },
    });
    video = await prisma.video.create({
      data: {
        title: 'Test Video Save',
        video_url: 'https://example.com/v.mp4',
        creator_id: user.id,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Save123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.save.deleteMany({}).catch(() => {});
    await prisma.video.deleteMany({ where: { id: video.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: 'save' } } }).catch(() => {});
  });

  it('GET /api/saves — liste des vidéos sauvegardées (auth)', async () => {
    const res = await request(app)
      .get('/api/saves')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('videos');
    expect(res.body.data).toHaveProperty('pagination');
  });

  it('POST /api/saves — sauvegarder une vidéo (auth)', async () => {
    const res = await request(app)
      .post('/api/saves')
      .set('Authorization', `Bearer ${token}`)
      .send({ video_id: video.id });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('saved');
  });
});
