import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Returns routes', () => {
  let testCounter = 0;
  let buyerToken = '';
  let sellerToken = '';
  let strangerToken = '';
  let adminToken = '';
  let buyerId = '';
  let sellerId = '';
  let orderId = '';
  let returnId = '';

  beforeEach(async () => {
    testCounter++;

    await prisma.return.deleteMany();
    await prisma.trackingEvent.deleteMany();
    await prisma.shipping.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();

    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const passwordHash = await bcrypt.hash('ReturnTest123!@#', 10);
    const unique = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const buyer = await prisma.user.create({
      data: {
        email: `buyer-return-${unique}@example.com`,
        username: `buyer_return_${unique}`,
        password_hash: passwordHash,
        full_name: 'Buyer Return',
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: `seller-return-${unique}@example.com`,
        username: `seller_return_${unique}`,
        password_hash: passwordHash,
        full_name: 'Seller Return',
      },
    });
    sellerId = seller.id;

    const stranger = await prisma.user.create({
      data: {
        email: `stranger-return-${unique}@example.com`,
        username: `stranger_return_${unique}`,
        password_hash: passwordHash,
        full_name: 'Stranger Return',
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: `admin-return-${unique}@example.com`,
        username: `admin_return_${unique}`,
        password_hash: passwordHash,
        full_name: 'Admin Return',
        role: 'admin',
      },
    });

    const product = await prisma.product.create({
      data: {
        seller_id: seller.id,
        name: 'Return Product',
        description: 'Return Product Description',
        price: 22000,
        stock: 10,
        status: 'active',
        category: 'electronics',
        images: ['https://example.com/r1.jpg'],
      },
    });

    const order = await prisma.order.create({
      data: {
        user_id: buyer.id,
        seller_id: seller.id,
        status: 'delivered',
        payment_status: 'paid',
        payment_method: 'orange_money',
        subtotal_amount: 22000,
        shipping_amount: 1000,
        tax_amount: 0,
        total_amount: 23000,
        shipping_address: 'Bamako, Mali',
        escrow_status: 'held',
        items: {
          create: {
            product_id: product.id,
            quantity: 1,
            unit_price: 22000,
          },
        },
      },
    });
    orderId = order.id;

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: buyer.email, password: 'ReturnTest123!@#' });
    buyerToken = buyerLogin.body.data.accessToken;

    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: seller.email, password: 'ReturnTest123!@#' });
    sellerToken = sellerLogin.body.data.accessToken;

    const strangerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: stranger.email, password: 'ReturnTest123!@#' });
    strangerToken = strangerLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'ReturnTest123!@#' });
    adminToken = adminLogin.body.data.accessToken;

    const created = await request(app)
      .post(`/api/returns/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'Produit defectueux',
        description: 'Echange demande',
        refund_amount: 5000,
      });

    returnId = created.body?.data?.id || '';
  });

  it('allows buyer to create return request', async () => {
    const product = await prisma.product.findFirstOrThrow();
    const secondOrder = await prisma.order.create({
      data: {
        user_id: buyerId,
        seller_id: sellerId || product.seller_id,
        status: 'delivered',
        payment_status: 'paid',
        subtotal_amount: 10000,
        shipping_amount: 500,
        tax_amount: 0,
        total_amount: 10500,
        shipping_address: 'Sikasso',
        escrow_status: 'held',
        items: {
          create: {
            product_id: product.id,
            quantity: 1,
            unit_price: 10000,
          },
        },
      },
    });

    const res = await request(app)
      .post(`/api/returns/${secondOrder.id}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'Mauvaise taille',
        description: 'Je veux un echange',
        refund_amount: 3000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');

    const notifications = await prisma.notification.findMany({
      where: {
        type: 'return_update',
        reference_type: 'return',
        reference_id: res.body.data.id,
      },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });

  it('blocks unrelated user from reading return details', async () => {
    const res = await request(app)
      .get(`/api/returns/${returnId}`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows seller to list returns for their orders', async () => {
    const res = await request(app)
      .get('/api/returns?scope=seller')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].order_id).toBe(orderId);
  });

  it('allows seller to update return status and tracking', async () => {
    const res = await request(app)
      .put(`/api/returns/${returnId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'exchange_approved',
        return_tracking_number: 'RET123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('exchange_approved');
    expect(res.body.data.return_tracking_number).toBe('RET123456');

    const notifications = await prisma.notification.findMany({
      where: {
        type: 'return_update',
        reference_type: 'return',
        reference_id: returnId,
      },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(4);
  });

  it('allows admin to list all returns', async () => {
    const res = await request(app)
      .get('/api/returns?scope=admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
