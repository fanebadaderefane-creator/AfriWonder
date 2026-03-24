import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('E2EE routes', () => {
  let accessToken = '';
  let userId = '';
  const suffix = `e2ee_${Date.now()}`;
  const email = `${suffix}@example.com`;
  const username = `user_${suffix}`;
  const password = 'StrongPass123!';

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_e2ee_routes';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_for_e2ee_routes';
  });

  beforeEach(async () => {
    if (!accessToken) {
      await prisma.user.deleteMany({ where: { OR: [{ email }, { username }] } });
      const reg = await request(app).post('/api/auth/register').send({
        email,
        username,
        password,
        full_name: 'E2EE Test User',
      });
      expect(reg.status).toBe(201);
      accessToken = reg.body?.data?.accessToken || '';
      userId = reg.body?.data?.user?.id || '';
      expect(accessToken).toBeTruthy();
      expect(userId).toBeTruthy();
    }
  });

  it('register device and upload prekeys successfully', async () => {
    const deviceId = `dev-${Date.now()}`;
    const register = await request(app)
      .post('/api/e2ee/devices/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        identityKeyPublic: 'pub_identity_test',
        signedPrekeyPublic: 'pub_signed_test',
        signedPrekeySignature: 'sig_signed_test',
        keyAlgo: 'p256-ecdh',
      });
    expect(register.status).toBe(201);
    expect(register.body?.success).toBe(true);

    const upload = await request(app)
      .post('/api/e2ee/prekeys/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        prekeys: [
          { keyId: 1, publicKey: 'prekey_pub_1' },
          { keyId: 2, publicKey: 'prekey_pub_2' },
        ],
      });
    expect(upload.status).toBe(201);
    expect(upload.body?.success).toBe(true);
    expect(upload.body?.data?.count).toBeGreaterThanOrEqual(2);
  });

  it('returns health info for uploaded prekeys', async () => {
    const deviceId = `health-${Date.now()}`;
    await request(app)
      .post('/api/e2ee/devices/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        identityKeyPublic: 'pub_identity_health',
        signedPrekeyPublic: 'pub_signed_health',
        signedPrekeySignature: 'sig_signed_health',
      })
      .expect(201);

    await request(app)
      .post('/api/e2ee/prekeys/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        prekeys: [{ keyId: 10, publicKey: 'prekey_pub_health_10' }],
      })
      .expect(201);

    const health = await request(app)
      .get('/api/e2ee/prekeys/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ deviceId });

    expect(health.status).toBe(200);
    expect(health.body?.success).toBe(true);
    expect(health.body?.data?.device_id).toBe(deviceId);
    expect(typeof health.body?.data?.available_prekeys).toBe('number');
  });

  it('stores one envelope and returns it in sync', async () => {
    const senderDeviceId = `sender-${Date.now()}`;
    const recipientDeviceId = `recipient-${Date.now()}`;
    await request(app)
      .post('/api/e2ee/devices/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId: senderDeviceId,
        identityKeyPublic: 'pub_identity_sync',
        signedPrekeyPublic: 'pub_signed_sync',
        signedPrekeySignature: 'sig_signed_sync',
      })
      .expect(201);

    const stored = await request(app)
      .post('/api/e2ee/messages/envelope')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        conversationId: 'conv-test-sync',
        senderDeviceId,
        recipientUserId: userId,
        recipientDeviceId,
        ciphertext: 'cipher_sync',
        iv: 'iv_sync',
        aad: Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64'),
        clientMessageId: `cmsg-${Date.now()}`,
      });
    expect(stored.status).toBe(201);
    expect(stored.body?.success).toBe(true);

    const sync = await request(app)
      .get('/api/e2ee/messages/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ deviceId: recipientDeviceId, limit: 50 });
    expect(sync.status).toBe(200);
    expect(sync.body?.success).toBe(true);
    expect(Array.isArray(sync.body?.data?.items)).toBe(true);
    expect(sync.body.data.items.some((x: any) => x.id === stored.body.data.id)).toBe(true);
  });

  it('rejects envelope when AAD sender does not match token user', async () => {
    const senderDeviceId = `sender-bad-aad-${Date.now()}`;
    await request(app)
      .post('/api/e2ee/devices/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId: senderDeviceId,
        identityKeyPublic: 'pub_identity_bad_aad',
        signedPrekeyPublic: 'pub_signed_bad_aad',
        signedPrekeySignature: 'sig_signed_bad_aad',
      })
      .expect(201);

    const badAad = Buffer.from(
      JSON.stringify({
        ts: Date.now(),
        senderUserId: 'forged-user-id',
        senderDeviceId,
      })
    ).toString('base64');

    const res = await request(app)
      .post('/api/e2ee/messages/envelope')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        conversationId: 'conv-bad-aad',
        senderDeviceId,
        recipientUserId: userId,
        recipientDeviceId: `recipient-bad-aad-${Date.now()}`,
        ciphertext: 'cipher_bad_aad',
        iv: 'iv_bad_aad',
        aad: badAad,
        clientMessageId: `bad-aad-${Date.now()}`,
      });

    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });
});
