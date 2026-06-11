import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Messages routes', () => {
  let testCounter = 0;
  let buyerId = '';
  let sellerId = '';
  let buyerToken = '';
  let sellerToken = '';

  beforeEach(async () => {
    testCounter++;
    await prisma.messageReport.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.userBlock.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const hash = await bcrypt.hash('MsgTest123!@#', 10);
    const uniq = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const buyer = await prisma.user.create({
      data: {
        email: `buyer-msg-${uniq}@example.com`,
        username: `buyer_msg_${uniq}`,
        password_hash: hash,
        full_name: 'Buyer Messages',
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: `seller-msg-${uniq}@example.com`,
        username: `seller_msg_${uniq}`,
        password_hash: hash,
        full_name: 'Seller Messages',
      },
    });
    sellerId = seller.id;

    let retries = 5;
    while (retries > 0) {
      const [buyerCheck, sellerCheck] = await Promise.all([
        prisma.user.findUnique({ where: { id: buyerId } }),
        prisma.user.findUnique({ where: { id: sellerId } }),
      ]);
      if (buyerCheck && sellerCheck) break;
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: buyer.email, password: 'MsgTest123!@#' });
    if (buyerLogin.status !== 200) {
      throw new Error(`Buyer login failed: ${buyerLogin.status} ${JSON.stringify(buyerLogin.body)}`);
    }
    buyerToken = buyerLogin.body.data.accessToken;

    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: seller.email, password: 'MsgTest123!@#' });
    if (sellerLogin.status !== 200) {
      throw new Error(`Seller login failed: ${sellerLogin.status} ${JSON.stringify(sellerLogin.body)}`);
    }
    sellerToken = sellerLogin.body.data.accessToken;
  });

  it('masks phone/email in chat content and creates recipient notification', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: sellerId,
        type: 'text',
        content: 'Mon numero est +223 70 12 34 56 et email test.user@example.com',
      });

    if (res.status !== 200) {
      throw new Error(`messages/send failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toContain('[contact masque]');
    expect(res.body.data.content).not.toContain('test.user@example.com');
    expect(res.body.data.content).not.toContain('70 12 34 56');

    const convo = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1_id: buyerId, user2_id: sellerId },
          { user1_id: sellerId, user2_id: buyerId },
        ],
      },
      select: { id: true, last_message_text: true },
    });
    expect(convo).toBeTruthy();
    expect(convo?.last_message_text).toContain('[contact masque]');

    const notif = await prisma.notification.findFirst({
      where: { user_id: sellerId, type: 'message_new' },
      orderBy: { created_at: 'desc' },
    });
    expect(notif).toBeTruthy();
  });

  it('rejects image message without media_url', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: sellerId,
        type: 'image',
        content: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates automatic order tracking message when seller updates order status', async () => {
    const product = await prisma.product.create({
      data: {
        seller_id: sellerId,
        name: 'Order Message Product',
        description: 'Desc',
        price: 10000,
        stock: 5,
        status: 'active',
        category: 'electronics',
        images: ['https://example.com/p.jpg'],
      },
    });

    let order: any;
    let retries = 3;
    while (retries > 0) {
      try {
        order = await prisma.order.create({
          data: {
            user_id: buyerId,
            seller_id: sellerId,
            status: 'pending',
            payment_status: 'pending',
            payment_method: 'orange_money',
            subtotal_amount: 10000,
            shipping_amount: 500,
            tax_amount: 0,
            total_amount: 10500,
            shipping_address: 'Bamako',
            escrow_status: 'pending',
            items: {
              create: {
                product_id: product.id,
                quantity: 1,
                unit_price: 10000,
              },
            },
          },
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'processing' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const convo = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1_id: buyerId, user2_id: sellerId },
          { user1_id: sellerId, user2_id: buyerId },
        ],
      },
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    expect(convo).toBeTruthy();
    expect(convo?.messages?.[0]?.content || '').toContain('Suivi commande');
    expect(convo?.messages?.[0]?.content || '').toContain('[BM:');
  });

  it('rejects unauthenticated scheduled messages list', async () => {
    const res = await request(app).get('/api/messages/scheduled');
    expect(res.status).toBe(401);
  });

  it('send attaches to explicit conversationId and rejects recipient mismatch', async () => {
    const open = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ recipientId: sellerId, type: 'text', content: 'ouvre fil' });
    expect(open.status).toBe(200);
    const convId = open.body.data.conversation_id as string;
    expect(convId).toBeTruthy();

    const mismatch = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: buyerId,
        conversationId: convId,
        type: 'text',
        content: 'mauvais destinataire',
      });
    expect(mismatch.status).toBe(400);

    const imgUrl = 'https://example.com/photo.jpg';
    const media = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: sellerId,
        conversationId: convId,
        type: 'image',
        content: 'Photo',
        media_url: imgUrl,
      });
    expect(media.status).toBe(200);
    expect(media.body.data.conversation_id).toBe(convId);
    expect(media.body.data.media_url).toBe(imgUrl);
  });

  it('returns scheduled DM list with peer display name', async () => {
    const empty = await request(app)
      .get('/api/messages/scheduled')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(empty.status).toBe(200);
    expect(empty.body.success).toBe(true);
    expect(Array.isArray(empty.body.data.items)).toBe(true);
    expect(empty.body.data.items).toHaveLength(0);

    const when = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const sendRes = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipientId: sellerId,
        type: 'text',
        content: 'Rappel demain',
        scheduled_at: when,
      });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.data.status).toBe('scheduled');

    const list = await request(app)
      .get('/api/messages/scheduled')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    const row = list.body.data.items[0];
    expect(row.channel).toBe('dm');
    expect(row.other_user_id).toBe(sellerId);
    expect(row.peer_display_name).toBe('Seller Messages');
    expect(row.preview).toContain('Rappel');
    expect(row.scheduled_at).toBeTruthy();
  });

  it('refuses conversation access to non-participants', async () => {
    const open = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ recipientId: sellerId, type: 'text', content: 'message privé' });
    expect(open.status).toBe(200);
    const convId = open.body.data.conversation_id as string;

    const hash = await bcrypt.hash('MsgTest123!@#', 10);
    const stranger = await prisma.user.create({
      data: {
        email: `stranger-msg-${Date.now()}@example.com`,
        username: `stranger_msg_${Date.now()}`,
        password_hash: hash,
        full_name: 'Stranger',
      },
    });
    const strangerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: stranger.email, password: 'MsgTest123!@#' });
    expect(strangerLogin.status).toBe(200);
    const strangerToken = strangerLogin.body.data.accessToken as string;

    const convRes = await request(app)
      .get(`/api/messages/conversations/id/${convId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(convRes.status).toBe(404);

    const msgsRes = await request(app)
      .get(`/api/messages/${convId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(msgsRes.status).toBe(404);
  });

  it('hides blocked peers from inbox and message reads', async () => {
    const open = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ recipientId: sellerId, type: 'text', content: 'salut vendeur' });
    expect(open.status).toBe(200);
    const convId = open.body.data.conversation_id as string;

    const blockRes = await request(app)
      .post('/api/messages/block')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ userId: sellerId });
    expect(blockRes.status).toBe(200);

    const buyerInbox = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerInbox.status).toBe(200);
    const buyerIds = (buyerInbox.body.data.conversations as Array<{ id: string }>).map((c) => c.id);
    expect(buyerIds).not.toContain(convId);

    const sellerMsgs = await request(app)
      .get(`/api/messages/${convId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerMsgs.status).toBe(404);
  });
});
