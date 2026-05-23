import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('e2ee.service', () => {
  let prisma: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules();
    const prismaMod = await import('../../config/database.js');
    prisma = prismaMod.default;
    const mod = await import('../e2ee.service.js');
    service = mod.default;
    jest.restoreAllMocks();
  });

  it('rejette une envelope si le device expéditeur n’existe pas', async () => {
    jest.spyOn(prisma.userE2eeDevice, 'findFirst').mockResolvedValueOnce(null);

    await expect(
      service.storeEnvelope('user-1', {
        conversationId: 'conv-1',
        senderDeviceId: 'dev-1',
        recipientUserId: 'user-2',
        recipientDeviceId: 'dev-2',
        ciphertext: 'abc',
        iv: 'def',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne l’envelope existante si idempotence match', async () => {
    jest.spyOn(prisma.userE2eeDevice, 'findFirst').mockResolvedValueOnce({ id: 'd1' } as any);
    const existing = {
      id: 'env-1',
      conversation_id: 'conv-1',
      group_id: null,
      message_id: 'm-1',
      group_message_id: null,
      sender_user_id: 'user-1',
      sender_device_id: 'dev-1',
      recipient_user_id: 'user-2',
      recipient_device_id: 'dev-2',
      message_type: 'text',
      cipher_algo: 'aes-gcm-256+ecdh-p256',
      client_message_id: 'cmsg-1',
      created_at: new Date(),
    };
    const findExistingSpy = jest
      .spyOn(prisma.encryptedMessageEnvelope, 'findFirst')
      .mockResolvedValueOnce(existing as any);
    const createSpy = jest.spyOn(prisma.encryptedMessageEnvelope, 'create');

    const res = await service.storeEnvelope('user-1', {
      conversationId: 'conv-1',
      messageId: 'm-1',
      senderDeviceId: 'dev-1',
      recipientUserId: 'user-2',
      recipientDeviceId: 'dev-2',
      ciphertext: 'abc',
      iv: 'def',
      clientMessageId: 'cmsg-1',
    });

    expect(findExistingSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).not.toHaveBeenCalled();
    expect(res.id).toBe('env-1');
  });

  it('rejette une envelope si AAD sender mismatch', async () => {
    jest.spyOn(prisma.userE2eeDevice, 'findFirst').mockResolvedValueOnce({ id: 'd1' } as any);
    jest.spyOn(prisma.encryptedMessageEnvelope, 'findFirst').mockResolvedValueOnce(null);

    const badAad = Buffer.from(
      JSON.stringify({
        ts: Date.now(),
        senderUserId: 'another-user',
        senderDeviceId: 'dev-1',
      }),
      'utf8'
    ).toString('base64');

    await expect(
      service.storeEnvelope('user-1', {
        conversationId: 'conv-1',
        senderDeviceId: 'dev-1',
        recipientUserId: 'user-2',
        recipientDeviceId: 'dev-2',
        ciphertext: 'abc',
        iv: 'def',
        aad: badAad,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
