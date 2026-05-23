/**
 * Stories API
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Stories API', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    const password = 'Stories123!@#';
    const hash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email: `stories-${Date.now()}@example.com`,
        username: `storiesuser${Date.now()}`,
        full_name: 'Stories User',
        password_hash: hash,
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.story.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'stories-' } },
    });
  });

  it('GET /api/stories sans auth retourne 401', async () => {
    const res = await request(app).get('/api/stories');
    expect(res.status).toBe(401);
  });

  it('POST /api/stories crée une story', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mediaUrl: 'http://example.com/image.jpg',
        mediaType: 'image',
        expiresInHours: 24,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/stories retourne les stories des utilisateurs', async () => {
    await prisma.story.create({
      data: {
        user_id: user.id,
        media_url: 'http://example.com/story.jpg',
        media_type: 'image',
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    const res = await request(app)
      .get('/api/stories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

