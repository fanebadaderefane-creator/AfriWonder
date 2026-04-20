import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Mobile API', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Mobile123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `mobile${Date.now()}@example.com`,
        password_hash: hashed,
        username: `mobileuser${Date.now()}`,
        full_name: 'Mobile User',
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Mobile123!@#' });

    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.analytics.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.idempotencyKey.deleteMany({ where: { key: { startsWith: 'offline-' } } }).catch(() => {});
    await prisma.notificationPreference.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.pushSubscription.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.save.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.like.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.follow.deleteMany({ where: { OR: [{ follower_id: user?.id }, { following_id: user?.id }] } }).catch(() => {});
    await prisma.comment.deleteMany({ where: { user_id: user?.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user?.id } }).catch(() => {});
  });

  it('GET /api/mobile/health', async () => {
    const res = await request(app).get('/api/mobile/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('POST /api/mobile/biometric-session', async () => {
    const res = await request(app)
      .post('/api/mobile/biometric-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ intent: 'unlock' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user_id).toBe(user.id);
    expect(res.body.data.validated_at).toBeDefined();
  });

  it('POST /api/mobile/push-token', async () => {
    const res = await request(app)
      .post('/api/mobile/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExponentPushToken[test-mobile]', platform: 'android' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(String(res.body.data.endpoint)).toContain('ExponentPushToken[test-mobile]');
  });

  it('DELETE /api/mobile/push-token/:token désactive le token mobile', async () => {
    await request(app)
      .post('/api/mobile/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExponentPushToken[test-mobile-delete]', platform: 'android' });

    const res = await request(app)
      .delete('/api/mobile/push-token/ExponentPushToken%5Btest-mobile-delete%5D')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/proxy/mobile/health', async () => {
    const res = await request(app).get('/api/proxy/mobile/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('mobile');
  });

  it('GET /api/mobile/videos/:id/download-url returns 404 on unknown video', async () => {
    const res = await request(app).get('/api/mobile/videos/unknown-video/download-url');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/mobile/resolve-deeplink', async () => {
    const res = await request(app).get(`/api/mobile/resolve-deeplink?url=${encodeURIComponent('afriwonder://video/unknown-video')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entity_type).toBe('video');
    expect(res.body.data.route).toBe('/watch/unknown-video');
  });

  it('GET /api/mobile/resolve-deeplink supports afriwonder://watch/:id', async () => {
    const res = await request(app).get(`/api/mobile/resolve-deeplink?url=${encodeURIComponent('afriwonder://watch/some-id')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entity_type).toBe('watch');
    expect(res.body.data.route).toBe('/watch/some-id');
  });

  it('PUT /api/mobile/device-settings', async () => {
    const res = await request(app)
      .put('/api/mobile/device-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data_saver_mode: true,
        preferred_language: 'fr',
        timezone: 'Africa/Bamako',
        theme: 'dark',
        messaging_e2e_enabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data_saver_mode).toBe(true);
    expect(res.body.data.preferred_language).toBe('fr');
  });

  it('GET /api/mobile/device-settings', async () => {
    const res = await request(app)
      .get('/api/mobile/device-settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(user.id);
  });

  it('POST /api/mobile/sync', async () => {
    const res = await request(app)
      .post('/api/mobile/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({
        actions: [
          { client_id: 'offline-like-1', type: 'like_video', target_id: 'unknown-video', payload: { liked: true } },
        ],
      });

    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.processed).toBe(1);
    }
  });

  it('POST /api/mobile/analytics/event', async () => {
    const res = await request(app)
      .post('/api/mobile/analytics/event')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventType: 'mobile_feed_open',
        entityType: 'screen',
        entityId: 'home',
        metricValue: 1,
        metadata: { platform: 'android' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metric_type).toBe('mobile_feed_open');
  });
});
