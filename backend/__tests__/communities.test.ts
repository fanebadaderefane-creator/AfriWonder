/**
 * QA - Communautes: list, get, create, join, leave
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Communities API', () => {
  let user: any;
  let community: any;
  let token: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `comm${Date.now()}@example.com`,
        password_hash: hashed,
        username: `commuser${Date.now()}`,
        full_name: 'Community User',
      },
    });
    community = await prisma.community.create({
      data: {
        name: 'Test Community',
        description: 'Description test',
        creator_id: user.id,
        is_private: false,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.communityMember.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/communities', () => {
    it('liste les communautes', async () => {
      const res = await request(app).get('/api/communities');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('communities');
      expect(res.body.data).toHaveProperty('pagination');
    });
  });

  describe('GET /api/communities/:id', () => {
    it('devrait retourner une communaute par id', async () => {
      const res = await request(app).get(`/api/communities/${community.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(community.id);
      expect(res.body.data.name).toBe('Test Community');
    });
  });

  describe('POST /api/communities', () => {
    it('devrait creer une communaute', async () => {
      const res = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Community',
          description: 'New desc',
          isPrivate: false,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Community');
    });
  });

  describe('POST /api/communities/:id/join', () => {
    it('devrait rejoindre une communaute', async () => {
      const other = await prisma.user.create({
        data: {
          email: `other${Date.now()}@example.com`,
          password_hash: await bcrypt.hash('Test123!@#', 10),
          username: `other${Date.now()}`,
          full_name: 'Other',
        },
      });
      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: other.email, password: 'Test123!@#' });
      const otherToken = otherLogin.body.data?.accessToken;
      const res = await request(app)
        .post(`/api/communities/${community.id}/join`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });
});
