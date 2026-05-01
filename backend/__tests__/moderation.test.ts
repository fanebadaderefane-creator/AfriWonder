/**
 * Moderation API
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Moderation API', () => {
  let user: any;
  let moderator: any;
  let userToken: string;
  let moderatorToken: string;

  beforeEach(async () => {
    const password = 'Moderation123!@#';
    const hash = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email: `mod-user-${Date.now()}@example.com`,
        username: `moduser${Date.now()}`,
        full_name: 'Normal User',
        password_hash: hash,
        role: 'user',
      },
    });

    moderator = await prisma.user.create({
      data: {
        email: `mod-admin-${Date.now()}@example.com`,
        username: `modadmin${Date.now()}`,
        full_name: 'Moderator User',
        password_hash: hash,
        role: 'moderator',
      },
    });

    const loginUser = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    userToken = loginUser.body.data?.accessToken || '';

    const loginMod = await request(app)
      .post('/api/auth/login')
      .send({ email: moderator.email, password });
    moderatorToken = loginMod.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.moderation.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'mod-' },
      },
    });
  });

  it('GET /api/moderation/reports sans auth retourne 401', async () => {
    const res = await request(app).get('/api/moderation/reports');
    expect(res.status).toBe(401);
  });

  it('POST /api/moderation/report crée un rapport', async () => {
    const res = await request(app)
      .post('/api/moderation/report')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        contentType: 'video',
        contentId: 'video-1',
        reason: 'spam',
        description: 'Contenu inapproprié',
        severity: 'medium',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message', 'Avis non trouvé');
  });

  it('GET /api/moderation/reports refuse un utilisateur sans droit de revue', async () => {
    await prisma.moderation.create({
      data: {
        reporter_id: user.id,
        content_type: 'video',
        content_id: 'video-1',
        reason: 'spam',
        severity: 'low',
        status: 'pending',
      },
    });

    const res = await request(app)
      .get('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 10, status: 'pending' });

    expect(res.status).toBe(403);
  });

  it('GET /api/moderation/reports retourne la liste paginée pour un modérateur', async () => {
    await prisma.moderation.create({
      data: {
        reporter_id: user.id,
        content_type: 'video',
        content_id: 'video-1',
        reason: 'spam',
        severity: 'low',
        status: 'pending',
      },
    });

    const res = await request(app)
      .get('/api/moderation/reports')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .query({ page: 1, limit: 10, status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reports');
    expect(Array.isArray(res.body.data.reports)).toBe(true);
  });

  it('PUT /api/moderation/reports/:id/review refuse un user non modérateur', async () => {
    const report = await prisma.moderation.create({
      data: {
        reporter_id: user.id,
        content_type: 'video',
        content_id: 'video-1',
        reason: 'spam',
        severity: 'low',
        status: 'pending',
      },
    });

    const res = await request(app)
      .put(`/api/moderation/reports/${report.id}/review`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'resolved', notes: 'OK' });

    expect(res.status).toBe(403);
  });

  it('PUT /api/moderation/reports/:id/review permet à un modérateur de traiter un rapport', async () => {
    const report = await prisma.moderation.create({
      data: {
        reporter_id: user.id,
        content_type: 'video',
        content_id: 'video-1',
        reason: 'spam',
        severity: 'low',
        status: 'pending',
      },
    });

    const res = await request(app)
      .put(`/api/moderation/reports/${report.id}/review`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ status: 'resolved', notes: 'Revue OK' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'resolved');
  });
});

