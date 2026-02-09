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
