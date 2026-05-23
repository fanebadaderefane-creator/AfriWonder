/**
 * Livraison forcee J1/J2:
 * - J1: message texte 1:1
 * - J2: message image 1:1 (upload + envoi media_url)
 */
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

function tinyPngBuffer(): Buffer {
  return Buffer.from(
    '89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000C4944415408D763F8FFFF3F0005FE02FEA7A69F140000000049454E44AE426082',
    'hex',
  );
}

describe('Messages delivery plan J1/J2', () => {
  let senderToken = '';
  let receiverToken = '';
  let senderId = '';
  let receiverId = '';

  beforeAll(async () => {
    const stamp = Date.now();
    const senderPwd = await bcrypt.hash('Sender#12345', 10);
    const receiverPwd = await bcrypt.hash('Receiver#12345', 10);

    const sender = await prisma.user.create({
      data: {
        email: `j1sender.${stamp}@example.com`,
        password_hash: senderPwd,
        username: `j1sender_${stamp}`,
        full_name: 'J1 Sender',
      },
    });
    const receiver = await prisma.user.create({
      data: {
        email: `j1receiver.${stamp}@example.com`,
        password_hash: receiverPwd,
        username: `j1receiver_${stamp}`,
        full_name: 'J2 Receiver',
      },
    });

    senderId = sender.id;
    receiverId = receiver.id;

    const loginSender = await request(app)
      .post('/api/auth/login')
      .send({ email: sender.email, password: 'Sender#12345' });
    const loginReceiver = await request(app)
      .post('/api/auth/login')
      .send({ email: receiver.email, password: 'Receiver#12345' });

    senderToken = loginSender.body?.data?.accessToken || '';
    receiverToken = loginReceiver.body?.data?.accessToken || '';
    expect(senderToken).toBeTruthy();
    expect(receiverToken).toBeTruthy();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [senderId, receiverId] } } }).catch(() => {});
  });

  it('J1 - envoie un message texte et il apparait dans la conversation', async () => {
    const sendRes = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientId: receiverId,
        content: 'J1 delivery message texte',
        type: 'text',
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
    expect(items.some((m: any) => String(m?.content || '').includes('J1 delivery message texte'))).toBe(true);
  });

  it('J2 - upload image puis envoie message image via media_url', async () => {
    const uploadRes = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${senderToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'j2-chat-image.png',
        contentType: 'image/png',
      });

    let mediaUrl = '';
    if (uploadRes.status === 200) {
      expect(uploadRes.body?.success).toBe(true);
      mediaUrl = String(uploadRes.body?.data?.file_url || uploadRes.body?.data?.url || '');
      expect(mediaUrl).toMatch(/^https?:\/\//);
    } else {
      // En CI/dev sans R2/S3, l'upload peut être indisponible (503).
      // On continue le test J2 sur la capacité du chat à accepter un message image.
      expect(uploadRes.status).toBe(503);
      mediaUrl = 'https://cdn.afriwonder.local/j2-chat-image.png';
    }

    const sendRes = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientId: receiverId,
        content: 'J2 image message',
        type: 'image',
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

    const items = Array.isArray(readRes.body?.data?.messages) ? readRes.body.data.messages : [];
    expect(items.some((m: any) => String(m?.media_url || '') === mediaUrl && String(m?.type || '') === 'image')).toBe(
      true,
    );
  });
});
