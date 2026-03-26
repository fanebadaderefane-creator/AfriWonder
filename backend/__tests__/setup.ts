/* cspell:disable */
/**
 * Setup global pour les tests Jest
 * Utilise le même prisma que l'application (database.ts)
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { beforeAll, afterAll } from '@jest/globals';

// Charger .env.test AVANT d'importer database (qui lit DATABASE_URL)
// Pas d'import.meta ici : Jest sans --experimental-vm-modules doit pouvoir parser ce fichier.
const envCandidates = [
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), 'backend', '.env.test'),
];

const resolvedEnvPath = envCandidates.find((p) => fs.existsSync(p));
if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath, override: true });
} else {
  dotenv.config({ override: true });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Créez .env.test avec DATABASE_URL.');
}

// Secrets JWT pour que login/tokens fonctionnent dans tous les tests d'intégration (auth, shipments, returns, etc.)
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_jwt_secret_global_for_all_tests';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_global_for_all_tests';

// Admin whitelist: tests create admin with admin@test.example.com
if (!process.env.SUPER_ADMIN_EMAIL) process.env.SUPER_ADMIN_EMAIL = 'admin@test.example.com';

// Éviter MaxListenersExceededWarning (database.ts et autres ajoutent des listeners beforeExit)
process.setMaxListeners(20);

// Utiliser le même prisma que l'application
import prisma from '../src/config/database.js';

(global as any).__PRISMA__ = prisma;

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connexion à la base de données de test réussie');
  } catch (error: any) {
    console.error('❌ Erreur de connexion à la base de données de test:', error);
    throw error;
  }

  const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
  try {
    const existing = await prisma.user.findUnique({ where: { id: PLATFORM_USER_ID } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: PLATFORM_USER_ID,
          email: 'platform@afriwonder.app',
          username: 'platform',
          password_hash: 'no-login',
          full_name: 'AfriWonder Platform',
          role: 'admin',
        },
      });
    }
    console.log('✅ Utilisateur plateforme créé/vérifié');
  } catch (err: any) {
    // Ignorer si l'email existe déjà (autre id) ou autre contrainte
    console.warn('⚠️ Erreur création utilisateur plateforme:', err.message);
  }
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
