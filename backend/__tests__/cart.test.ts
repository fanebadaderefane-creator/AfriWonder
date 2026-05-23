/**
 * QA — Panier : get, add, update, remove, clear, breakdown
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Cart API', () => {
  let user: any;
  let product: any;
  let token: string;
  const ts = Date.now();

  beforeEach(async () => {
    const hashed = await bcrypt.hash('Test123!@#', 10);
    user = await prisma.user.create({
      data: {
        email: `cart${ts}${Math.random().toString(36).slice(2, 8)}@example.com`,
        password_hash: hashed,
        username: `cartuser${ts}`,
        full_name: 'Cart User',
      },
    });
    await prisma.sellerProfile.create({
      data: { user_id: user.id, store_name: 'Store' },
    });
    await prisma.sellerWallet.create({
      data: { user_id: user.id, balance: 0 },
    });
    product = await prisma.product.create({
      data: {
        seller_id: user.id,
        name: 'Produit Cart Test',
        description: 'Desc',
        price: 5000,
        stock: 10,
        status: 'active',
        images: [],
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test123!@#' });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    await prisma.cart.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.sellerWallet.deleteMany({});
    await prisma.sellerProfile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/cart', () => {
    it('devrait retourner le panier (vide ou avec items)', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('subtotal');
    });
  });

  describe('POST /api/cart/add', () => {
    it('devrait ajouter un produit au panier', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 2 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subtotal).toBe(10000);
      const items = res.body.data.items as any[];
      expect(items.some((i: any) => i.productId === product.id)).toBe(true);
    });

    it('devrait rejeter productId invalide', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 });
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/cart/update', () => {
    it('devrait mettre à jour la quantité', async () => {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 2 });
      const res = await request(app)
        .put('/api/cart/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(15000);
    });
  });

  describe('DELETE /api/cart/remove/:productId', () => {
    it('devrait retirer un produit du panier', async () => {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });
      const res = await request(app)
        .delete(`/api/cart/remove/${product.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(0);
    });
  });

  describe('DELETE /api/cart/clear', () => {
    it('devrait vider le panier', async () => {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });
      const res = await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(0);
    });
  });

  describe('GET /api/cart/breakdown', () => {
    it('devrait retourner le breakdown avec frais', async () => {
      const res = await request(app)
        .get('/api/cart/breakdown')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('subtotal');
    });
  });
});
