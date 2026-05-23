import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('GET /api/me/call-history', () => {
  let testCounter = 0;
  let userId = '';
  let peerId = '';
  let token = '';

  beforeEach(async () => {
    testCounter++;
    await prisma.groupCallParticipant.deleteMany();
    await prisma.groupCall.deleteMany();
    await prisma.directCall.deleteMany();
    await prisma.conversationGroupMember.deleteMany();
    await prisma.conversationGroup.deleteMany();

    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const hash = await bcrypt.hash('CallHist123!@#', 10);
    const uniq = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const user = await prisma.user.create({
      data: {
        email: `callhist-${uniq}@example.com`,
        username: `callhist_${uniq}`,
        password_hash: hash,
        full_name: 'Call History User',
      },
    });
    userId = user.id;

    const peer = await prisma.user.create({
      data: {
        email: `callhist-peer-${uniq}@example.com`,
        username: `callhist_peer_${uniq}`,
        password_hash: hash,
        full_name: 'Peer User',
      },
    });
    peerId = peer.id;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'CallHist123!@#' });
    if (login.status !== 200) {
      throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
    }
    token = login.body.data.accessToken;
  });

  it('returns merged DM and group call rows for the authenticated user', async () => {
    const started = new Date('2025-01-10T10:00:00.000Z');
    const ended = new Date('2025-01-10T10:05:30.000Z');

    await prisma.directCall.create({
      data: {
        caller_id: userId,
        receiver_id: peerId,
        status: 'completed',
        started_at: started,
        ended_at: ended,
        duration: 330,
      },
    });

    const group = await prisma.conversationGroup.create({
      data: {
        name: 'Test CDC Group',
        created_by_id: userId,
        members: { create: [{ user_id: userId }, { user_id: peerId }] },
      },
    });

    const roomId = `room_${userId.slice(0, 8)}_${Date.now()}`;
    const gcStarted = new Date('2025-01-11T12:00:00.000Z');
    const gcEnded = new Date('2025-01-11T12:03:00.000Z');
    const groupCall = await prisma.groupCall.create({
      data: {
        creator_id: userId,
        room_id: roomId,
        status: 'ended',
        type: 'video',
        started_at: gcStarted,
        ended_at: gcEnded,
        conversation_group_id: group.id,
      },
    });

    await prisma.groupCallParticipant.create({
      data: {
        call_id: groupCall.id,
        user_id: userId,
        joined_at: gcStarted,
        left_at: gcEnded,
      },
    });

    const res = await request(app)
      .get('/api/me/call-history')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { items, pagination } = res.body.data;
    expect(pagination.page).toBe(1);
    expect(pagination.total).toBe(2);
    expect(items).toHaveLength(2);

    const dm = items.find((r: { channel: string }) => r.channel === 'dm');
    expect(dm).toMatchObject({
      channel: 'dm',
      direction: 'out',
      status: 'completed',
      duration_sec: 330,
    });
    expect(dm.peer?.id).toBe(peerId);

    const grp = items.find((r: { channel: string }) => r.channel === 'group');
    expect(grp).toMatchObject({
      channel: 'group',
      direction: 'group',
      status: 'ended',
      duration_sec: 180,
    });
    expect(grp.group?.name).toBe('Test CDC Group');
  });

  it('sorts pending DM calls without started_at using created_at', async () => {
    await prisma.directCall.create({
      data: {
        caller_id: peerId,
        receiver_id: userId,
        status: 'pending',
        started_at: null,
        ended_at: null,
      },
    });

    const res = await request(app)
      .get('/api/me/call-history')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    const row = res.body.data.items[0];
    expect(row.channel).toBe('dm');
    expect(row.direction).toBe('in');
    expect(row.status).toBe('pending');
  });
});
