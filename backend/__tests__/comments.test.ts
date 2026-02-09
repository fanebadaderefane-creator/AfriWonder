/**
 * QA - Commentaires: update, delete
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Comments API', () => {
  let user: any;
  let video: any;
  let comment: any;
  let token: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `com${Date.now()}@example.com`,
        password_hash: hashed,
        username: `comuser${Date.now()}`,
        full_name: 'Comment User',
      },
    });
    video = await prisma.video.create({
      data: {
        title: 'Video for comments',
        video_url: 'https://cdn.test/v.mp4',
        creator_id: user.id,
        visibility: 'public',
      },
    });
    comment = await prisma.comment.create({
      data: {
        video_id: video.id,
        user_id: user.id,
        content: 'Original comment',
        user_name: user.full_name,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.comment.deleteMany({});
    await prisma.video.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('PUT /api/comments/:id', () => {
    it('modifie son propre commentaire', async () => {
      const res = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated content' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Updated content');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('supprime son propre commentaire', async () => {
      const res = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });
  });
});
