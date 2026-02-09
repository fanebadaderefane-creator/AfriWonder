/**
 * Tests complets du marketplace AfriWonder
 * Exécution: npm test -- marketplace.test.ts
 * 
 * IMPORTANT: Ces tests nécessitent une base de données PostgreSQL de test
 * Configurer DATABASE_URL dans .env.test
 */
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../app.js';
import { prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Marketplace Complet', () => {
  let testBuyer: any;
  let testSeller: any;
  let testProduct: any;
  let testCart: any;
  let testOrder: any;
  let buyerToken: string;
  let sellerToken: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    const timestamp = Date.now();

    // Nettoyer les données
    await prisma.inventoryLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.review.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.sellerReview.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();

    // Créer un acheteur
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    testBuyer = await prisma.user.create({
      data: {
        email: `buyer${testCounter}${timestamp}@example.com`,
        password_hash: hashedPassword,
        username: `buyer${testCounter}${timestamp}`,
        full_name: 'Test Buyer',
      },
    });

    // Créer un vendeur
    testSeller = await prisma.user.create({
      data: {
        email: `seller${testCounter}${timestamp}@example.com`,
        password_hash: hashedPassword,
        username: `seller${testCounter}${timestamp}`,
        full_name: 'Test Seller',
      },
    });

    // Créer le profil vendeur (nouveau schéma SellerProfile)
    await prisma.sellerProfile.create({
      data: {
        user_id: testSeller.id,
        store_name: 'Test Business',
      },
    });

    // Créer le wallet vendeur (lié à l'utilisateur)
    await prisma.sellerWallet.create({
      data: {
        user_id: testSeller.id,
        balance: 0,
      },
    });

    // Créer un produit
    testProduct = await prisma.product.create({
      data: {
        seller_id: testSeller.id,
        name: 'Produit Test Marketplace',
        description: 'Description test',
        price: 10000,
        stock: 10,
        status: 'active',
        category: 'electronics',
      },
    });

    // Créer un panier
    testCart = await prisma.cart.create({
      data: {
        user_id: testBuyer.id,
        items: [
          { productId: testProduct.id, quantity: 2, price: 10000, sellerId: testSeller.id },
        ],
        subtotal: 20000,
        coupon_discount: 0,
      },
    });

    // Attendre que les utilisateurs soient disponibles
    let retries = 5;
    while (retries > 0) {
      const buyer = await prisma.user.findUnique({ where: { id: testBuyer.id } });
      const seller = await prisma.user.findUnique({ where: { id: testSeller.id } });
      if (buyer && seller) break;
      await new Promise(resolve => setTimeout(resolve, 50));
      retries--;
    }

    // Se connecter comme acheteur
    const buyerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testBuyer.email,
        password: 'Test123!@#',
      });
    buyerToken = buyerLoginResponse.body.data?.accessToken || '';
    if (!buyerToken) {
      throw new Error(
        `Auth buyer failed: ${buyerLoginResponse.status} ${JSON.stringify(buyerLoginResponse.body)}`
      );
    }

    // Se connecter comme vendeur
    const sellerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testSeller.email,
        password: 'Test123!@#',
      });
    sellerToken = sellerLoginResponse.body.data?.accessToken || '';
    if (!sellerToken) {
      throw new Error(
        `Auth seller failed: ${sellerLoginResponse.status} ${JSON.stringify(sellerLoginResponse.body)}`
      );
    }
  });

  afterEach(async () => {
    await prisma.inventoryLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.review.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.sellerReview.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Products API', () => {
    it('devrait lister les produits', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
    });

    it('devrait récupérer un produit par ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProduct.id);
    });

    it('devrait créer un produit (vendeur)', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          name: 'Nouveau Produit',
          description: 'Description',
          price: 15000,
          category: 'electronics',
          stock: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Nouveau Produit');
    });
  });

  describe('Cart API', () => {
    it('devrait récupérer le panier', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
    });

    it('devrait ajouter un produit au panier', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('devrait mettre à jour la quantité dans le panier', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('devrait supprimer un produit du panier', async () => {
      const response = await request(app)
        .delete(`/api/cart/remove/${testProduct.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Orders API', () => {
    it('devrait créer une commande depuis le panier', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      if (Array.isArray(response.body.data)) {
        expect(response.body.data.length).toBeGreaterThan(0);
        testOrder = response.body.data[0];
      } else {
        testOrder = response.body.data;
      }
    });

    it('devrait lister les commandes de l\'acheteur', async () => {
      // Créer une commande d'abord
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orders');
    });

    it('devrait lister les commandes du vendeur', async () => {
      // Créer une commande d'abord
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .query({ as: 'seller', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Reviews API', () => {
    it('devrait créer un avis produit', async () => {
      // Créer une commande et la confirmer d'abord
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      let orderId;
      if (Array.isArray(orderResponse.body.data)) {
        orderId = orderResponse.body.data[0]?.id;
      } else {
        orderId = orderResponse.body.data?.id;
      }

      if (orderId) {
        // Confirmer le paiement
        await request(app)
          .post(`/api/orders/${orderId}/confirm-payment`)
          .set('Authorization', `Bearer ${buyerToken}`);

        // Créer l'avis
        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            productId: testProduct.id,
            rating: 5,
            title: 'Excellent produit',
            content: 'Très satisfait',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('devrait lister les avis d\'un produit', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct.id}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reviews');
    });
  });

  describe('Seller Reviews API', () => {
    it('devrait créer un avis vendeur', async () => {
      // Créer une commande d'abord
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      let orderId;
      if (Array.isArray(orderResponse.body.data)) {
        orderId = orderResponse.body.data[0]?.id;
      } else {
        orderId = orderResponse.body.data?.id;
      }

      if (orderId) {
        const response = await request(app)
          .post('/api/seller-reviews')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            seller_id: testSeller.id,
            rating: 5,
            content: 'Excellent vendeur',
            order_id: orderId,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('devrait lister les avis d\'un vendeur', async () => {
      const response = await request(app)
        .get(`/api/seller-reviews/seller/${testSeller.id}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reviews');
    });
  });

  describe('Disputes API', () => {
    it('devrait créer un litige', async () => {
      // Créer une commande d'abord
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      let orderId;
      if (Array.isArray(orderResponse.body.data)) {
        orderId = orderResponse.body.data[0]?.id;
      } else {
        orderId = orderResponse.body.data?.id;
      }

      if (orderId) {
        const response = await request(app)
          .post('/api/disputes')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            order_id: orderId,
            seller_id: testSeller.id,
            reason: 'produit_non_conforme',
            description: 'Le produit ne correspond pas à la description',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('devrait lister les litiges de l\'acheteur', async () => {
      const response = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ role: 'buyer', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Shipping API', () => {
    it('devrait lister les points relais', async () => {
      const response = await request(app)
        .get('/api/shipping/pickup-points')
        .query({ country: 'Mali' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('devrait calculer les frais de livraison', async () => {
      const response = await request(app)
        .get('/api/shipping/rates')
        .query({
          destinationCountry: 'Mali',
          weight: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Payments API', () => {
    it('devrait initier un paiement Orange Money', async () => {
      // Créer une commande d'abord
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        });

      let orderId;
      if (Array.isArray(orderResponse.body.data)) {
        orderId = orderResponse.body.data[0]?.id;
      } else {
        orderId = orderResponse.body.data?.id;
      }

      if (orderId) {
        const response = await request(app)
          .post('/api/payments/orange-money/initiate')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            orderId: orderId,
            phone: '+22370123456',
            returnUrl: 'http://localhost:5173/payment/success',
          });

        // Peut retourner 200 ou 400 selon la configuration Orange Money
        expect([200, 400]).toContain(response.status);
      }
    });
  });
});
