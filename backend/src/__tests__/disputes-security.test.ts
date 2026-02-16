import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

const TEST_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@test.example.com';

describe('Disputes security', () => {
  let buyer: any;
  let seller: any;
  let admin: any;
  let buyerToken = '';
  let adminToken = '';
  let disputeId = '';

  beforeEach(async () => {
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.disputeMessage.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const pwd = await bcrypt.hash('Test123!@#', 10);
    const ts = Date.now();

    buyer = await prisma.user.create({
      data: {
        email: `buyer.dispute.${ts}@example.com`,
        username: `buyer_dispute_${ts}`,
        password_hash: pwd,
        full_name: 'Buyer Dispute',
      },
    });
    seller = await prisma.user.create({
      data: {
        email: `seller.dispute.${ts}@example.com`,
        username: `seller_dispute_${ts}`,
        password_hash: pwd,
        full_name: 'Seller Dispute',
      },
    });
    admin = await prisma.user.create({
      data: {
        email: TEST_ADMIN_EMAIL,
        username: `admin_dispute_${ts}`,
        password_hash: pwd,
        full_name: 'Admin Dispute',
        role: 'admin',
      },
    });

    const product = await prisma.product.create({
      data: {
        seller_id: seller.id,
        name: 'Product Dispute',
        description: 'desc',
        price: 12000,
        stock: 5,
        category: 'electronics',
        status: 'active',
      },
    });

    const order = await prisma.order.create({
      data: {
        user_id: buyer.id,
        seller_id: seller.id,
        subtotal_amount: 12000,
        total_amount: 12000,
        status: 'paid',
        payment_status: 'paid',
      },
    });

    await prisma.orderItem.create({
      data: {
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        unit_price: 12000,
      },
    });

    const dispute = await prisma.dispute.create({
      data: {
        order_id: order.id,
        user_id: buyer.id,
        seller_id: seller.id,
        reason: 'test_reason',
        description: 'test dispute',
        status: 'open',
      },
    });
    disputeId = dispute.id;

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: buyer.email, password: 'Test123!@#' });
    buyerToken = buyerLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test123!@#' });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterEach(async () => {
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.disputeMessage.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });
  });

  it('blocks non-admin access to as=admin list', async () => {
    const res = await request(app)
      .get('/api/disputes')
      .set('Authorization', `Bearer ${buyerToken}`)
      .query({ as: 'admin' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to list all disputes with as=admin', async () => {
    const res = await request(app)
      .get('/api/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ as: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d: any) => d.id === disputeId)).toBe(true);
  });
});
