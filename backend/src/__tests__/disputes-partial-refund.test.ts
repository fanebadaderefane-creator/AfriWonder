import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Disputes partial refund', () => {
  let buyer: any;
  let seller: any;
  let admin: any;
  let adminToken = '';
  let disputeId = '';
  let orderId = '';

  beforeEach(async () => {
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.disputeMessage.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });

    const pwd = await bcrypt.hash('Test123!@#', 10);
    const ts = Date.now();

    buyer = await prisma.user.create({
      data: {
        email: `buyer.partial.${ts}@example.com`,
        username: `buyer_partial_${ts}`,
        password_hash: pwd,
        full_name: 'Buyer Partial',
      },
    });
    seller = await prisma.user.create({
      data: {
        email: `seller.partial.${ts}@example.com`,
        username: `seller_partial_${ts}`,
        password_hash: pwd,
        full_name: 'Seller Partial',
      },
    });
    admin = await prisma.user.create({
      data: {
        email: `admin.partial.${ts}@example.com`,
        username: `admin_partial_${ts}`,
        password_hash: pwd,
        full_name: 'Admin Partial',
        role: 'admin',
      },
    });

    await prisma.sellerWallet.create({
      data: {
        user_id: seller.id,
        balance: 0,
        currency: 'XOF',
      },
    });

    const product = await prisma.product.create({
      data: {
        seller_id: seller.id,
        name: 'Product Partial Refund',
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
        payment_status: 'escrow',
        escrow_status: 'held',
      },
    });
    orderId = order.id;

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
        reason: 'partial_refund_needed',
        description: 'package damaged',
        status: 'open',
      },
    });
    disputeId = dispute.id;

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
    await prisma.wallet.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: PLATFORM_USER_ID } } });
  });

  it('resolves dispute with partial refund and releases remaining funds', async () => {
    const res = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resolution_type: 'partial_refund',
        resolution: 'Compensation partielle validée',
        refund_amount: 3000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sellerWallet = await prisma.sellerWallet.findUnique({ where: { user_id: seller.id } });
    expect(sellerWallet).toBeTruthy();
    // 12000 - 10% commission = 10800 ; partial refund 3000 => 7800 vendeur
    expect(Number((sellerWallet!.balance || 0).toFixed(2))).toBe(7800);

    const buyerWallet = await prisma.wallet.findFirst({
      where: { user_id: buyer.id, wallet_type: 'user' },
    });
    expect(buyerWallet).toBeTruthy();
    expect(Number((buyerWallet!.available_balance || 0).toFixed(2))).toBe(3000);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.escrow_status).toBe('released');
    expect(order?.payment_status).toBe('released');
  });

  it('rejects invalid partial refund amount', async () => {
    const res = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resolution_type: 'partial_refund',
        resolution: 'Invalid amount',
        refund_amount: 12000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

