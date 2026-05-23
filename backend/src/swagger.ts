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
        description: 'Racine — chemins historiques /api/* et /api/proxy/*',
      },
      {
        url: `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/v1`,
        description:
          'Surface API versionnée (durabilité) : health, feedback, extensions documentées ici ; le reste reste sur la racine jusqu’à migration progressive.',
      },
      {
        url: 'https://api.afriwonder.app',
        description: 'Production (racine)',
      },
    ],
    paths: {
      '/api/v1': {
        get: {
          tags: ['API v1'],
          summary: 'Découverte de la surface versionnée',
          description:
            'Retourne les URL stables (health, OpenAPI, feedback). Les intégrations existantes ne sont pas cassées : /api et /api/proxy restent valides.',
          security: [],
          responses: {
            '200': {
              description: 'Métadonnées',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      service: { type: 'string', example: 'afriwonder-api' },
                      api_version: { type: 'integer', example: 1 },
                      health: { type: 'string', example: '/api/v1/health' },
                      openapi: { type: 'string', example: '/api-docs' },
                      feedback_post: { type: 'string', example: '/api/v1/platform-feedback' },
                      note: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/health': {
        get: {
          tags: ['API v1'],
          summary: 'Santé étendue (DB, Redis)',
          description: 'Identique à GET /api/health — exposé sous le préfixe versionné.',
          security: [],
          responses: {
            '200': { description: 'OK' },
            '503': { description: 'Dégradé' },
          },
        },
      },
      '/api/v1/platform-feedback': {
        post: {
          tags: ['API v1', 'Feedback'],
          summary: 'Retour utilisateur (bug, suggestion, commentaire)',
          description: 'Public — même contrat que POST /api/platform-feedback.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['bug', 'suggestion', 'comment'],
                      default: 'comment',
                    },
                    content: { type: 'string', minLength: 3, maxLength: 5000 },
                    email: { type: 'string', format: 'email', nullable: true },
                    join_whatsapp: { type: 'boolean' },
                    join_mailing: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Enregistré' },
            '400': { description: 'Corps invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
    },
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
      {
        name: 'API v1',
        description: 'Contrats versionnés (/api/v1/*) — préférence pour nouvelles intégrations',
      },
      { name: 'Feedback', description: 'Retours utilisateurs plateforme' },
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
