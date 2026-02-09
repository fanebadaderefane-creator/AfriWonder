import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Products API', () => {
  let testUser: any;
  let authToken: string;
  let testProduct: any;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    // Créer un utilisateur de test avec email unique
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    testUser = await prisma.user.create({
      data: {
        email: `test${testCounter}${Date.now()}@example.com`,
        password_hash: hashedPassword,
        username: `testuser${testCounter}${Date.now()}`,
        full_name: 'Test User'
      }
    });

    // Attendre que l'utilisateur soit disponible dans la base de données
    let retries = 5;
    while (retries > 0) {
      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      if (user) break;
      await new Promise(resolve => setTimeout(resolve, 50));
      retries--;
    }

    // Se connecter pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'Test123!@#'
      });

    // Vérifier que le login a réussi
    if (loginResponse.status !== 200 || !loginResponse.body.data?.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.data.accessToken;

    // Créer un profil et un wallet vendeur pour l'utilisateur (requis par l'API produits)
    await prisma.sellerProfile.create({
      data: {
        user_id: testUser.id,
        store_name: 'Test Store',
      },
    });

    await prisma.sellerWallet.create({
      data: {
        user_id: testUser.id,
        balance: 0,
      },
    });

    // Créer un produit de test seulement si le login a réussi
    if (authToken && testUser.id) {
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product',
          description: 'Test Description',
          price: 10000,
          seller_id: testUser.id,
          category: 'electronics',
          stock: 10,
          images: []
        }
      });
    }
  });

  afterEach(async () => {
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('GET /api/products', () => {
    it('devrait retourner la liste des produits', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('devrait supporter la pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('devrait filtrer par catégorie', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ category: 'electronics', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      const products = response.body.data.products;
      products.forEach((product: any) => {
        expect(product.category).toBe('electronics');
      });
    });
  });

  describe('GET /api/products/:id', () => {
    it('devrait retourner les détails d\'un produit', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProduct.id);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('devrait retourner 404 pour un produit inexistant', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/products', () => {
    it('devrait créer un nouveau produit', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Product',
          description: 'New Description',
          price: 20000,
          category: 'electronics',
          stock: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Product');
      expect(response.body.data.seller_id).toBe(testUser.id);
    });

    it('devrait rejeter un produit sans nom', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Description only',
          price: 10000,
          stock: 5,
          images: []
        });

      expect(response.status).toBe(400);
    });

    it('devrait rejeter une requête non authentifiée', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'New Product',
          price: 10000
        });

      expect(response.status).toBe(401);
    });
  });
});

