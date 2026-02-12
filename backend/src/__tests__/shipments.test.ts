import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';

describe('Shipments routes', () => {
  let testCounter = 0;
  let buyerToken = '';
  let sellerToken = '';
  let strangerToken = '';
  let buyerId = '';
  let sellerId = '';
  let strangerId = '';
  let orderId = '';

  beforeEach(async () => {
    testCounter++;
    await prisma.trackingEvent.deleteMany();
    await prisma.shipping.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    await prisma.user.deleteMany({
      where: { id: { not: PLATFORM_USER_ID } },
    });

    const passwordHash = await bcrypt.hash('ShipTest123!@#', 10);
    const unique = `${Date.now()}_${testCounter}_${Math.floor(Math.random() * 100000)}`;

    const buyer = await prisma.user.create({
      data: {
        email: `buyer-ship-${unique}@example.com`,
        username: `buyer_ship_${unique}`,
        password_hash: passwordHash,
        full_name: 'Buyer Shipment',
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: `seller-ship-${unique}@example.com`,
        username: `seller_ship_${unique}`,
        password_hash: passwordHash,
        full_name: 'Seller Shipment',
      },
    });
    sellerId = seller.id;

    const stranger = await prisma.user.create({
      data: {
        email: `stranger-ship-${unique}@example.com`,
        username: `stranger_ship_${unique}`,
        password_hash: passwordHash,
        full_name: 'Stranger Shipment',
      },
    });
    strangerId = stranger.id;

    let retries = 5;
    while (retries > 0) {
      const [buyerCheck, sellerCheck, strangerCheck] = await Promise.all([
        prisma.user.findUnique({ where: { id: buyerId } }),
        prisma.user.findUnique({ where: { id: sellerId } }),
        prisma.user.findUnique({ where: { id: strangerId } }),
      ]);
      if (buyerCheck && sellerCheck && strangerCheck) break;
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    let product: any;
    retries = 3;
    while (retries > 0) {
      try {
        product = await prisma.product.create({
          data: {
            seller_id: sellerId,
            name: 'Shipment Product',
            description: 'Shipment Product Description',
            price: 15000,
            stock: 20,
            status: 'active',
            category: 'electronics',
            images: ['https://example.com/p1.jpg'],
          },
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }

    let order: any;
    retries = 3;
    while (retries > 0) {
      try {
        order = await prisma.order.create({
          data: {
            user_id: buyerId,
            seller_id: sellerId,
            status: 'in_transit',
            payment_status: 'paid',
            payment_method: 'orange_money',
            subtotal_amount: 15000,
            shipping_amount: 1000,
            tax_amount: 0,
            total_amount: 16000,
            shipping_address: 'Bamako, Mali',
            escrow_status: 'held',
            items: {
              create: {
                product_id: product.id,
                quantity: 1,
                unit_price: 15000,
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
    orderId = order.id;

    await prisma.shipping.create({
      data: {
        order_id: orderId,
        tracking_number: `TRK${unique}`,
        carrier: 'DHL Mali',
        status: 'in_transit',
        shipping_address: 'Bamako, Mali',
        cost: 1000,
        current_location: 'Bamako Hub',
      },
    });

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: buyer.email, password: 'ShipTest123!@#' });
    if (buyerLogin.status !== 200) {
      throw new Error(`Buyer login failed: ${buyerLogin.status} ${JSON.stringify(buyerLogin.body)}`);
    }
    buyerToken = buyerLogin.body.data.accessToken;

    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: seller.email, password: 'ShipTest123!@#' });
    if (sellerLogin.status !== 200) {
      throw new Error(`Seller login failed: ${sellerLogin.status} ${JSON.stringify(sellerLogin.body)}`);
    }
    sellerToken = sellerLogin.body.data.accessToken;

    const strangerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: stranger.email, password: 'ShipTest123!@#' });
    if (strangerLogin.status !== 200) {
      throw new Error(`Stranger login failed: ${strangerLogin.status} ${JSON.stringify(strangerLogin.body)}`);
    }
    strangerToken = strangerLogin.body.data.accessToken;
  });

  it('allows buyer to read shipment timeline', async () => {
    const res = await request(app)
      .get(`/api/shipments/${orderId}/timeline`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shipping.order_id).toBe(orderId);
  });

  it('blocks non-seller from adding tracking events', async () => {
    const res = await request(app)
      .post(`/api/shipments/${orderId}/tracking`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        event_type: 'out_for_delivery',
        description: 'Courier left hub',
        location: 'Bamako',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('requires proof photo and signature for delivery confirmation', async () => {
    const res = await request(app)
      .post(`/api/shipments/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ current_location: 'Bamako' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows seller to confirm delivery with proof and signature', async () => {
    const res = await request(app)
      .post(`/api/shipments/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        proof_of_delivery_photo: 'https://cdn.example.com/proof.jpg',
        signature: 'signed-by-customer',
        current_location: 'Bamako, Hamdallaye',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const shipping = await prisma.shipping.findUnique({ where: { order_id: orderId } });
    expect(shipping?.status).toBe('delivered');
    expect(shipping?.proof_of_delivery_photo).toBe('https://cdn.example.com/proof.jpg');
    expect(shipping?.signature).toBe('signed-by-customer');

    const shipmentNotifications = await prisma.notification.findMany({
      where: {
        type: 'shipment_update',
        reference_type: 'order',
        reference_id: orderId,
      },
    });
    expect(shipmentNotifications.length).toBeGreaterThanOrEqual(2);
  });

  it('blocks timeline access for unrelated users', async () => {
    expect(strangerId).not.toBe(buyerId);
    expect(strangerId).not.toBe(sellerId);

    const res = await request(app)
      .get(`/api/shipments/${orderId}/timeline`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
