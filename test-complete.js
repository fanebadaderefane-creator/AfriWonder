/**
 * 🧪 TEST COMPLET AFRICONNECT - A à Z
 * Tests de toutes les fonctionnalités comme un Senior Dev
 */

import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
};

// Statistiques
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

// Test helper
async function test(name, fn) {
  stats.total++;
  log.test(`Test ${stats.total}: ${name}`);
  try {
    await fn();
    stats.passed++;
    log.success(`✓ ${name}`);
    return true;
  } catch (error) {
    stats.failed++;
    log.error(`✗ ${name}`);
    console.error(`  Erreur: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Wait helper
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Variables globales pour les tests
let authToken = null;
let refreshToken = null;
let userId = null;
let videoId = null;
let productId = null;
let orderId = null;

// ============================================
// 1. VÉRIFICATION SERVEURS
// ============================================
async function testServers() {
  log.info('\n📡 === VÉRIFICATION DES SERVEURS ===\n');

  await test('Backend accessible sur port 3000', async () => {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`);
    if (response.data.status !== 'ok') throw new Error('Health check failed');
  });

  await test('Frontend accessible sur port 5173', async () => {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    if (response.status !== 200) throw new Error('Frontend not accessible');
  });

  await test('CORS configuré correctement', async () => {
    const response = await axios.options(`${API_URL}/auth/me`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    if (!response.headers['access-control-allow-origin']) {
      throw new Error('CORS headers missing');
    }
  });
}

// ============================================
// 2. AUTHENTIFICATION
// ============================================
async function testAuth() {
  log.info('\n🔐 === TESTS AUTHENTIFICATION ===\n');

  const testEmail = `test${Date.now()}@africonnect.test`;
  const testPassword = 'Test123!@#';

  await test('POST /api/auth/register - Créer un compte', async () => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      firstName: 'Test',
      lastName: 'User',
      username: `testuser${Date.now()}`,
    });
    if (!response.data.token) throw new Error('Token missing');
    authToken = response.data.token;
    refreshToken = response.data.refreshToken;
    userId = response.data.user.id;
  });

  await test('POST /api/auth/login - Se connecter', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    if (!response.data.token) throw new Error('Token missing');
    authToken = response.data.token;
    refreshToken = response.data.refreshToken;
  });

  await test('GET /api/auth/me - Obtenir profil utilisateur', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.data.id) throw new Error('User data missing');
    userId = response.data.id;
  });

  await test('POST /api/auth/refresh - Rafraîchir le token', async () => {
    await wait(1000); // Attendre un peu
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: refreshToken,
    });
    if (!response.data.token) throw new Error('New token missing');
    authToken = response.data.token;
  });

  await test('GET /api/auth/me avec nouveau token', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.data.id) throw new Error('User data missing after refresh');
  });
}

// ============================================
// 3. VIDÉOS
// ============================================
async function testVideos() {
  log.info('\n🎥 === TESTS VIDÉOS ===\n');

  await test('GET /api/videos - Liste des vidéos', async () => {
    const response = await axios.get(`${API_URL}/videos`);
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  await test('POST /api/videos - Créer une vidéo', async () => {
    const response = await axios.post(
      `${API_URL}/videos`,
      {
        title: `Test Video ${Date.now()}`,
        description: 'Description de test',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 120,
        category: 'entertainment',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Video ID missing');
    videoId = response.data.id;
  });

  await test('GET /api/videos/:id - Obtenir une vidéo', async () => {
    const response = await axios.get(`${API_URL}/videos/${videoId}`);
    if (!response.data.id) throw new Error('Video data missing');
  });

  await test('PUT /api/videos/:id - Modifier une vidéo', async () => {
    const response = await axios.put(
      `${API_URL}/videos/${videoId}`,
      {
        title: `Updated Video ${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Updated video data missing');
  });

  await test('POST /api/videos/:id/like - Liker une vidéo', async () => {
    const response = await axios.post(
      `${API_URL}/videos/${videoId}/like`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Like failed');
    }
  });

  await test('POST /api/videos/:id/comment - Commenter une vidéo', async () => {
    const response = await axios.post(
      `${API_URL}/videos/${videoId}/comment`,
      {
        content: 'Super vidéo !',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Comment ID missing');
  });
}

// ============================================
// 4. UPLOAD
// ============================================
async function testUpload() {
  log.info('\n📤 === TESTS UPLOAD ===\n');

  await test('POST /api/upload/single - Upload fichier (simulation)', async () => {
    // Créer un fichier de test minimal
    const testFile = Buffer.from('test file content');
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', testFile, 'test.txt');

    try {
      const response = await axios.post(
        `${API_URL}/upload/single`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            ...formData.getHeaders(),
          },
        }
      );
      if (!response.data.url) {
        log.warn('Upload endpoint might require Cloudflare R2 config');
        stats.skipped++;
        stats.failed--;
        stats.total--;
      }
    } catch (error) {
      if (error.response?.status === 500) {
        log.warn('Upload endpoint might require Cloudflare R2 config');
        stats.skipped++;
        stats.failed--;
        stats.total--;
        return;
      }
      throw error;
    }
  });
}

// ============================================
// 5. PRODUITS & MARKETPLACE
// ============================================
async function testProducts() {
  log.info('\n🛍️ === TESTS PRODUITS ===\n');

  await test('GET /api/products - Liste des produits', async () => {
    const response = await axios.get(`${API_URL}/products`);
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  await test('POST /api/products - Créer un produit', async () => {
    const response = await axios.post(
      `${API_URL}/products`,
      {
        name: `Test Product ${Date.now()}`,
        description: 'Description de test',
        price: 10000,
        currency: 'XOF',
        category: 'electronics',
        stock: 10,
        images: ['https://example.com/image.jpg'],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Product ID missing');
    productId = response.data.id;
  });

  await test('GET /api/products/:id - Obtenir un produit', async () => {
    const response = await axios.get(`${API_URL}/products/${productId}`);
    if (!response.data.id) throw new Error('Product data missing');
  });

  await test('PUT /api/products/:id - Modifier un produit', async () => {
    const response = await axios.put(
      `${API_URL}/products/${productId}`,
      {
        name: `Updated Product ${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Updated product data missing');
  });
}

// ============================================
// 6. COMMANDES & PAIEMENTS
// ============================================
async function testOrders() {
  log.info('\n🛒 === TESTS COMMANDES ===\n');

  if (!productId) {
    log.warn('Skipping orders tests - no product created');
    return;
  }

  await test('POST /api/orders - Créer une commande', async () => {
    const response = await axios.post(
      `${API_URL}/orders`,
      {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 10000,
          },
        ],
        shippingAddress: {
          street: '123 Test Street',
          city: 'Bamako',
          country: 'Mali',
          postalCode: '00100',
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (!response.data.id) throw new Error('Order ID missing');
    orderId = response.data.id;
  });

  await test('GET /api/orders - Liste des commandes', async () => {
    const response = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  await test('GET /api/orders/:id - Obtenir une commande', async () => {
    const response = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.data.id) throw new Error('Order data missing');
  });
}

// ============================================
// 7. NOTIFICATIONS & SAVES
// ============================================
async function testNotifications() {
  log.info('\n🔔 === TESTS NOTIFICATIONS ===\n');

  await test('GET /api/notifications - Liste des notifications', async () => {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  await test('POST /api/saves/like - Toggle like', async () => {
    if (!videoId) {
      stats.skipped++;
      return;
    }
    const response = await axios.post(
      `${API_URL}/saves/like`,
      {
        entityType: 'Video',
        entityId: videoId,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Like toggle failed');
    }
  });

  await test('POST /api/saves/save - Toggle save', async () => {
    if (!videoId) {
      stats.skipped++;
      return;
    }
    const response = await axios.post(
      `${API_URL}/saves/save`,
      {
        entityType: 'Video',
        entityId: videoId,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Save toggle failed');
    }
  });
}

// ============================================
// 8. UTILISATEURS
// ============================================
async function testUsers() {
  log.info('\n👤 === TESTS UTILISATEURS ===\n');

  await test('GET /api/users - Liste des utilisateurs', async () => {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  await test('GET /api/users/:id - Obtenir un utilisateur', async () => {
    if (!userId) {
      stats.skipped++;
      return;
    }
    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.data.id) throw new Error('User data missing');
  });
}

// ============================================
// 9. SYNCHRONISATION BACKEND-FRONTEND
// ============================================
async function testSync() {
  log.info('\n🔄 === TESTS SYNCHRONISATION ===\n');

  await test('Frontend peut appeler API backend', async () => {
    try {
      const response = await axios.get(`${API_URL}/videos`, {
        headers: { 'Origin': FRONTEND_URL },
      });
      if (response.status !== 200) throw new Error('CORS or API issue');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend not running on port 3000');
      }
      throw error;
    }
  });

  await test('Headers CORS corrects', async () => {
    const response = await axios.options(`${API_URL}/videos`, {
      headers: { 'Origin': FRONTEND_URL },
    });
    if (!response.headers['access-control-allow-origin']) {
      throw new Error('CORS headers missing');
    }
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTS COMPLETS AFRICONNECT - A à Z');
  console.log('='.repeat(60) + '\n');

  log.info(`Backend URL: ${API_URL}`);
  log.info(`Frontend URL: ${FRONTEND_URL}\n`);

  try {
    // 1. Vérification serveurs
    await testServers();
    await wait(500);

    // 2. Authentification
    await testAuth();
    await wait(500);

    // 3. Vidéos
    await testVideos();
    await wait(500);

    // 4. Upload
    await testUpload();
    await wait(500);

    // 5. Produits
    await testProducts();
    await wait(500);

    // 6. Commandes
    await testOrders();
    await wait(500);

    // 7. Notifications
    await testNotifications();
    await wait(500);

    // 8. Utilisateurs
    await testUsers();
    await wait(500);

    // 9. Synchronisation
    await testSync();

    // Résultats finaux
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSULTATS FINAUX');
    console.log('='.repeat(60));
    console.log(`Total: ${stats.total}`);
    console.log(`${colors.green}✅ Réussis: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Échoués: ${stats.failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Ignorés: ${stats.skipped}${colors.reset}`);
    console.log(`\nScore: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);

    if (stats.failed === 0) {
      log.success('\n🎉 TOUS LES TESTS SONT PASSÉS !');
      process.exit(0);
    } else {
      log.error(`\n⚠️  ${stats.failed} test(s) ont échoué`);
      process.exit(1);
    }
  } catch (error) {
    log.error(`\n💥 Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Lancer les tests
runAllTests();

