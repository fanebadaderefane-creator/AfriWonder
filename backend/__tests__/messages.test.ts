/**
 * QA - SOCIAL: Messagerie / Chat
 * GET /api/messages/conversations, /api/messages/unread/count
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Messages API (chat)', () => {
  let token: string;
  let user: any;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('Msg123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `msg${Date.now()}@example.com`,
        password_hash: hashed,
        username: `msguser${Date.now()}`,
        full_name: 'Message User',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Msg123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'msg' } } }).catch(() => {});
  });

  it('GET /api/messages/conversations returns list', async () => {
    const res = await request(app)
      .get('/api/messages/conversations')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/messages/unread/count returns count', async () => {
    const res = await request(app)
      .get('/api/messages/unread/count')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/messages/conversations?inbox=requests returns 200', async () => {
    const res = await request(app)
      .get('/api/messages/conversations')
      .query({ inbox: 'requests', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.conversations)).toBe(true);
  });

  it('POST /api/messages/presence/batch returns presences map', async () => {
    const peer = await prisma.user.create({
      data: {
        email: `peer${Date.now()}@example.com`,
        password_hash: await bcrypt.hash('Peer123!@#', 10),
        username: `peer${Date.now()}`,
        full_name: 'Peer User',
      },
    });
    await prisma.userPresence.create({
      data: { id: crypto.randomUUID(), user_id: peer.id, is_online: true, last_seen: new Date() },
    });

    const res = await request(app)
      .post('/api/messages/presence/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ userIds: [peer.id, 'missing-user-id'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.presences?.[peer.id]?.is_online).toBe(true);
    expect(res.body.data?.presences?.['missing-user-id']?.is_online).toBe(false);

    await prisma.userPresence.deleteMany({ where: { user_id: peer.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: peer.id } }).catch(() => {});
  });
});
