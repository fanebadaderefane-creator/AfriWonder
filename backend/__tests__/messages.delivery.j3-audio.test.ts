/**
 * Livraison forcee J3:
 * - message audio 1:1 (upload audio si dispo, fallback media_url contrôlé sinon)
 */
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

function tinyWavBuffer(): Buffer {
  // WAV PCM 8kHz mono, très court (signature RIFF/WAVE valide).
  return Buffer.from(
    '524946462400000057415645666d74201000000001000100401f0000803e0000020010006461746100000000',
    'hex',
  );
}

describe('Messages delivery plan J3 audio', () => {
  let senderToken = '';
  let receiverToken = '';
  let senderId = '';
  let receiverId = '';

  beforeAll(async () => {
    const stamp = Date.now();
    const senderPwd = await bcrypt.hash('Sender#Audio3', 10);
    const receiverPwd = await bcrypt.hash('Receiver#Audio3', 10);

    const sender = await prisma.user.create({
      data: {
        email: `j3sender.${stamp}@example.com`,
        password_hash: senderPwd,
        username: `j3sender_${stamp}`,
        full_name: 'J3 Sender',
      },
    });
    const receiver = await prisma.user.create({
      data: {
        email: `j3receiver.${stamp}@example.com`,
        password_hash: receiverPwd,
        username: `j3receiver_${stamp}`,
        full_name: 'J3 Receiver',
      },
    });

    senderId = sender.id;
    receiverId = receiver.id;

    const loginSender = await request(app)
      .post('/api/auth/login')
      .send({ email: sender.email, password: 'Sender#Audio3' });
    const loginReceiver = await request(app)
      .post('/api/auth/login')
      .send({ email: receiver.email, password: 'Receiver#Audio3' });

    senderToken = loginSender.body?.data?.accessToken || '';
    receiverToken = loginReceiver.body?.data?.accessToken || '';
    expect(senderToken).toBeTruthy();
    expect(receiverToken).toBeTruthy();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [senderId, receiverId] } } }).catch(() => {});
  });

  it('J3 - envoie message audio (upload réel ou fallback contrôlé)', async () => {
    const uploadRes = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${senderToken}`)
      .attach('file', tinyWavBuffer(), {
        filename: 'j3-audio.wav',
        contentType: 'audio/wav',
      });

    let mediaUrl = '';
    if (uploadRes.status === 200) {
      mediaUrl = String(uploadRes.body?.data?.file_url || uploadRes.body?.data?.url || '');
      expect(mediaUrl).toMatch(/^https?:\/\//);
    } else {
      expect(uploadRes.status).toBe(503);
      mediaUrl = 'https://cdn.afriwonder.local/j3-audio.wav';
    }

    const sendRes = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientId: receiverId,
        content: 'J3 audio message',
        type: 'audio',
        media_url: mediaUrl,
      });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body?.success).toBe(true);
    const conversationId = String(sendRes.body?.data?.conversation_id || '');
    expect(conversationId).toBeTruthy();

    const readRes = await request(app)
      .get(`/api/messages/${conversationId}`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body?.success).toBe(true);

    const items = Array.isArray(readRes.body?.data?.messages) ? readRes.body.data.messages : [];
    expect(items.some((m: any) => String(m?.type || '') === 'audio' && String(m?.media_url || '') === mediaUrl)).toBe(
      true,
    );
  });
});
