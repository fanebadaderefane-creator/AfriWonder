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
});
