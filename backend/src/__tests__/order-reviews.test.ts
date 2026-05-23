import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Order Reviews routes', () => {
  let buyerId = '';
  let sellerId = '';
  let buyerToken = '';
  let sellerToken = '';
  let productId = '';
  let orderId = '';
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    await prisma.orderReview.deleteMany();
    await prisma.sellerReview.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerProfile.deleteMany();
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const hash = await bcrypt.hash('OrderReview123!@#', 10);
    const uniq = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const buyer = await prisma.user.create({
      data: {
        email: `buyer-orev-${uniq}@example.com`,
        username: `buyer_orev_${uniq}`,
        password_hash: hash,
        full_name: 'Buyer ORev',
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: `seller-orev-${uniq}@example.com`,
        username: `seller_orev_${uniq}`,
        password_hash: hash,
        full_name: 'Seller ORev',
      },
    });
    sellerId = seller.id;

    await prisma.sellerProfile.create({
      data: {
        user_id: sellerId,
        store_name: 'Seller ORev Store',
      },
    });

    productId = (
      await prisma.product.create({
        data: {
          seller_id: sellerId,
          name: 'Order Review Product',
          description: 'Order Review Product Desc',
          price: 12000,
          stock: 10,
          status: 'active',
          category: 'electronics',
          images: ['https://example.com/p.jpg'],
        },
      })
    ).id;

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

    retries = 5;
    while (retries > 0) {
      const buyerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: buyer.email, password: 'OrderReview123!@#' });
      if (buyerLogin.status === 200) {
        buyerToken = buyerLogin.body.data.accessToken;
        break;
      }
      retries--;
      if (retries === 0) throw new Error(`Buyer login failed: ${buyerLogin.status} ${JSON.stringify(buyerLogin.body)}`);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    retries = 5;
    while (retries > 0) {
      const sellerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: seller.email, password: 'OrderReview123!@#' });
      if (sellerLogin.status === 200) {
        sellerToken = sellerLogin.body.data.accessToken;
        break;
      }
      retries--;
      if (retries === 0) throw new Error(`Seller login failed: ${sellerLogin.status} ${JSON.stringify(sellerLogin.body)}`);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    retries = 4;
    while (retries > 0) {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: 'Bamako',
          payment_method: 'orange_money',
          items: [{ product_id: productId, quantity: 1 }],
        });

      const created = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
      orderId = created?.id;
      if (orderId) break;

      retries--;
      if (retries === 0) {
        throw new Error(`Order create failed: ${orderRes.status} ${JSON.stringify(orderRes.body)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });

  it('rejects order review before confirmed delivery', async () => {
    const res = await request(app)
      .post('/api/order-reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        order_id: orderId,
        product_id: productId,
        product_rating: 5,
        seller_rating: 5,
        content: 'Produit top',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates review after delivered order and syncs seller review', async () => {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        payment_status: 'paid',
      },
    });

    const res = await request(app)
      .post('/api/order-reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        order_id: orderId,
        product_id: productId,
        product_rating: 5,
        seller_rating: 4,
        quality_rating: 5,
        communication_rating: 4,
        delivery_rating: 4,
        conformity_rating: 5,
        content: 'Conforme et livraison correcte',
        photos: ['https://example.com/rev1.jpg'],
      });

    if (res.status !== 201) {
      throw new Error(`order-reviews create failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_verified).toBe(true);

    const sellerReview = await prisma.sellerReview.findFirst({
      where: { seller_id: sellerId, user_id: buyerId, order_id: orderId },
    });
    expect(sellerReview).toBeTruthy();
    expect(sellerReview?.rating).toBe(4);
  }, 60000);

  it('rejects invalid detailed rating value', async () => {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        payment_status: 'paid',
      },
    });

    const res = await request(app)
      .post('/api/order-reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        order_id: orderId,
        product_id: productId,
        product_rating: 6,
        content: 'Bad rating payload',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
