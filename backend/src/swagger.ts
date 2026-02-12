/**
 * Configuration Swagger/OpenAPI pour la documentation API.
 * Installation: npm install swagger-ui-express swagger-jsdoc
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AfriWonder API',
      version: '1.0.0',
      description: 'API complète pour la marketplace AfriWonder - Réseau social et e-commerce africain',
      contact: {
        name: 'Support AfriWonder',
        email: 'support@afriwonder.app',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3000',
        description: 'Serveur de développement',
      },
      {
        url: 'https://api.afriwonder.app',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              oneOf: [
                { type: 'string', example: 'Invalid request' },
                {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Invalid request' },
                  },
                },
              ],
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            seller_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', example: 15000 },
            stock: { type: 'integer', example: 12 },
            status: { type: 'string', example: 'active' },
            category: { type: 'string', example: 'electronics' },
            images: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
            price: { type: 'number' },
            sellerId: { type: 'string', format: 'uuid' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'number' },
            coupon_code: { type: 'string', nullable: true },
            coupon_discount: { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            seller_id: { type: 'string', format: 'uuid' },
            total_amount: { type: 'number' },
            status: { type: 'string', example: 'pending' },
            payment_status: { type: 'string', example: 'pending' },
            shipping_address: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 120 },
            totalPages: { type: 'integer', example: 6 },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des utilisateurs' },
      { name: 'Products', description: 'Gestion des produits marketplace' },
      { name: 'Orders', description: 'Gestion des commandes' },
      { name: 'Cart', description: 'Gestion du panier' },
      { name: 'Payments', description: 'Paiements (Orange Money, Stripe)' },
      { name: 'Sellers', description: 'Gestion des vendeurs' },
      { name: 'Shipping', description: 'Livraison et suivi' },
      { name: 'Reviews', description: 'Avis produits et vendeurs' },
      { name: 'Disputes', description: 'Litiges et réclamations' },
      { name: 'Admin', description: 'Administration et modération' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Exemple d'annotation Swagger pour une route :
 * 
 * @swagger
 * /api/products:
 *   get:
 *     summary: Liste des produits
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrer par catégorie
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
