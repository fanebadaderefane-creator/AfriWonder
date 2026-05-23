import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { prisma } from '../../__tests__/setup.js';

describe('RGPD — /api/users/me et /api/me/export', () => {
  let authToken: string;
  const unique = `gdpr${Date.now()}`;

  beforeEach(async () => {
    const existing = await prisma.user.findFirst({
      where: { email: `${unique}@example.com` },
      select: { id: true },
    });
    if (existing) {
      await prisma.accountDeletionRequest.deleteMany({ where: { user_id: existing.id } });
      await prisma.user.deleteMany({ where: { id: existing.id } });
    }

    const passwordHash = await bcrypt.hash('GdprTest123!', 10);
    await prisma.user.create({
      data: {
        email: `${unique}@example.com`,
        username: `user_${unique}`,
        password_hash: passwordHash,
        full_name: 'GDPR Test User',
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `${unique}@example.com`, password: 'GdprTest123!' })
      .expect(200);
    authToken = loginRes.body.data.accessToken;
  });

  it('GET /api/users/me/export — JSON avec user_data', async () => {
    const res = await request(app)
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data?.user_data).toBeDefined();
    expect(res.body.data?.export_date).toBeDefined();
  });

  it('GET /api/me/export — même payload', async () => {
    const res = await request(app)
      .get('/api/me/export')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data?.user_data?.email).toContain('@example.com');
  });

  it('DELETE /api/users/me — crée une demande de suppression', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'test audit' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data?.status).toBe('pending');
  });
});
