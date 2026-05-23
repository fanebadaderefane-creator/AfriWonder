/**
 * Wishlist API
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from './setup.js';

describe('Wishlist API', () => {
  let user: any;
  let product: any;
  let token: string;

  beforeEach(async () => {
    const password = 'Wishlist123!@#';
    const hash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email: `wishlist-${Date.now()}@example.com`,
        username: `wishlistuser${Date.now()}`,
        full_name: 'Wishlist User',
        password_hash: hash,
      },
    });

    product = await prisma.product.create({
      data: {
        seller_id: user.id,
        name: 'Produit Test Wishlist',
        description: 'Desc',
        price: 1000,
        stock: 5,
        status: 'active',
        images: [],
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    token = login.body.data?.accessToken || '';
  });

  afterEach(async () => {
    // Les entrées de wishlist sont supprimées en cascade avec l'utilisateur
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'wishlist-' } },
    });
  });

  it('GET /api/wishlist sans auth retourne 401', async () => {
    const res = await request(app).get('/api/wishlist');
    expect(res.status).toBe(401);
  });

  it('POST /api/wishlist/add ajoute un produit dans la wishlist', async () => {
    const res = await request(app)
      .post('/api/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/wishlist retourne la liste des produits', async () => {
    // D'abord ajouter via l'API
    await request(app)
      .post('/api/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id });

    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/wishlist/check/:productId indique si le produit est en wishlist', async () => {
    await request(app)
      .post('/api/wishlist/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id });

    const res = await request(app)
      .get(`/api/wishlist/check/${product.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('isInWishlist', true);
  });
});

