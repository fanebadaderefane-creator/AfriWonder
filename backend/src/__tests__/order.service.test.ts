/**
 * Tests unitaires pour order.service.ts avec base de données de test
 * Exécution: npm test -- order.service.test.ts
 * 
 * IMPORTANT: Ces tests nécessitent une base de données PostgreSQL de test
 * Configurer DATABASE_URL dans .env.test
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from './setup.js';
import orderService from '../services/order.service.js';
import escrowService from '../services/escrow.service.js';

describe('OrderService', () => {
  // IDs de test réutilisables
  let testUserId: string;
  let testSellerId: string;
  let testProductId: string;
  let testCartId: string;

  beforeEach(async () => {
    // Nettoyer les données de test précédentes (dans l'ordre des dépendances)
    await prisma.inventoryLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();

    // Créer un utilisateur de test
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // Créer un vendeur de test
    const sellerUser = await prisma.user.create({
      data: {
        username: 'testseller',
        email: 'seller@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test Seller',
      },
    });
    testSellerId = sellerUser.id;

    await prisma.sellerProfile.create({
      data: {
        user_id: testSellerId,
        store_name: 'Test Business',
      },
    });

    await prisma.sellerWallet.create({
      data: {
        user_id: testSellerId,
        balance: 0,
      },
    });

    // Créer un produit de test
    const testProduct = await prisma.product.create({
      data: {
        seller_id: testSellerId,
        name: 'Produit Test',
        description: 'Description test',
        price: 10000,
        stock: 10,
        status: 'active',
        category: 'test',
      },
    });
    testProductId = testProduct.id;

    // Créer un panier de test
    const testCart = await prisma.cart.create({
      data: {
        user_id: testUserId,
        items: [
          { productId: testProductId, quantity: 2, price: 10000, sellerId: testSellerId },
        ],
        subtotal: 20000,
        coupon_discount: 0,
      },
    });
    testCartId = testCart.id;

    // Créer un utilisateur plateforme pour les tests confirmPayment
    const platformUserId = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
    try {
      await prisma.user.create({
        data: {
          id: platformUserId,
          username: 'platform',
          email: 'platform@afriwonder.com',
          password_hash: 'platform_hash',
          full_name: 'Platform User',
        },
      });
    } catch (err: any) {
      // L'utilisateur existe peut-être déjà, ignorer l'erreur
      if (!err.message?.includes('Unique constraint')) {
        throw err;
      }
    }

    // Créer un wallet pour la plateforme
    try {
      await prisma.wallet.create({
        data: {
          user_id: platformUserId,
          balance: 0,
        },
      });
    } catch (err: any) {
      // Le wallet existe peut-être déjà, ignorer l'erreur
      if (!err.message?.includes('Unique constraint')) {
        throw err;
      }
    }
  });

  afterEach(async () => {
    // Nettoyer après chaque test (dans l'ordre des dépendances)
    await prisma.inventoryLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerWallet.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('createFromCart', () => {
    it('devrait créer une commande depuis le panier', async () => {
      const result = await orderService.createFromCart(testUserId, {
        shipping_address: '123 Rue Test',
        payment_method: 'orange_money',
      });

      expect(result).toBeDefined();
      // createFromCart retourne soit la première commande (si une seule), soit { orders: [], count: N }
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
      } else if (result.orders) {
        expect(result.orders.length).toBeGreaterThan(0);
      } else {
        // C'est une seule commande
        expect(result.id).toBeDefined();
      }
      
      // Vérifier que la commande a été créée en DB
      const orders = await prisma.order.findMany({
        where: { user_id: testUserId },
      });
      expect(orders.length).toBeGreaterThan(0);
      expect(orders[0].status).toBe('pending');
    });

    it('devrait rejeter si le panier est vide', async () => {
      // Vider le panier
      await prisma.cart.update({
        where: { id: testCartId },
        data: { items: [], subtotal: 0 },
      });

      await expect(
        orderService.createFromCart(testUserId, {
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        })
      ).rejects.toThrow('Panier vide');
    });

    it('devrait rejeter si le stock est insuffisant', async () => {
      // Mettre le stock à 1 alors que le panier demande 2
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 1 },
      });

      await expect(
        orderService.createFromCart(testUserId, {
          shipping_address: '123 Rue Test',
          payment_method: 'orange_money',
        })
      ).rejects.toThrow('Stock insuffisant');
    });
  });

  describe('confirmPayment', () => {
    it('devrait confirmer le paiement et distribuer les fonds', async () => {
      // Créer une commande avec OrderItem
      const order = await prisma.order.create({
        data: {
          user_id: testUserId,
          subtotal_amount: 20000,
          total_amount: 20000,
          status: 'pending',
          payment_method: 'orange_money',
          shipping_address: '123 Rue Test',
          items: {
            create: {
              product_id: testProductId,
              quantity: 2,
              unit_price: 10000,
            },
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: true,
                },
              },
            },
          },
        },
      });

      const result = await orderService.confirmPayment(order.id);

      expect(result).toBeDefined();
      expect(result.status).toBe('paid');
      expect(result.payment_status).toBe('escrow');

      // Les fonds sont en escrow après confirmPayment ; on simule la libération (livraison confirmée)
      await escrowService.releaseFunds(order.id, 'delivery_confirmed');

      // Vérifier que le wallet du vendeur a été crédité après release
      const sellerWallet = await prisma.sellerWallet.findUnique({
        where: { user_id: testSellerId },
      });
      expect(sellerWallet?.balance).toBeGreaterThan(0);
    });

    it('devrait rejeter si la commande n\'existe pas', async () => {
      await expect(orderService.confirmPayment('order-inexistant')).rejects.toThrow(
        'Commande non trouvée'
      );
    });

    it('devrait retourner alreadyProcessed si la commande a déjà été traitée', async () => {
      const order = await prisma.order.create({
        data: {
          user_id: testUserId,
          subtotal_amount: 20000,
          total_amount: 20000,
          status: 'paid',
          payment_status: 'escrow',
          payment_method: 'orange_money',
          shipping_address: '123 Rue Test',
        },
      });

      const result = await orderService.confirmPayment(order.id);
      expect(result.alreadyProcessed).toBe(true);
      expect(result.order.id).toBe(order.id);
    });
  });
});
