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
});
