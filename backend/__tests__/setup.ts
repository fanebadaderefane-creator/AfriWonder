/* cspell:disable */
/**
 * Setup global pour les tests Jest
 * Utilise le même prisma que l'application (database.ts)
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { beforeAll } from '@jest/globals';

// Charger .env.test AVANT d'importer database (qui lit DATABASE_URL)
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), 'backend', '.env.test'),
  path.resolve(currentDir, '..', '.env.test'),
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
    await prisma.user.upsert({
      where: { id: PLATFORM_USER_ID },
      update: {},
      create: {
        id: PLATFORM_USER_ID,
        email: 'platform@afriwonder.app',
        username: 'platform',
        password_hash: 'no-login',
        full_name: 'AfriWonder Platform',
        role: 'admin',
      },
    });
    console.log('✅ Utilisateur plateforme créé/vérifié');
  } catch (err: any) {
    console.warn('⚠️ Erreur création utilisateur plateforme:', err.message);
  }
});

export { prisma };
