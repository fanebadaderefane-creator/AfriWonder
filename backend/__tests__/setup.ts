/* cspell:disable */
/**
 * Setup global pour les tests Jest
 * Utilise le même prisma que l'application (database.ts)
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { beforeAll, afterAll } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';

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

// Pool Supabase/Supavisor: éviter "Max client connections reached" en tests.
// On force un pool minimal (1) pour que Jest --runInBand reste stable.
if (!process.env.DATABASE_POOL_MAX) process.env.DATABASE_POOL_MAX = '1';

// Secrets JWT pour que login/tokens fonctionnent dans tous les tests d'intégration (auth, shipments, returns, etc.)
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_jwt_secret_global_for_all_tests';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_global_for_all_tests';

// Admin whitelist: tests create admin with admin@test.example.com
if (!process.env.SUPER_ADMIN_EMAIL) process.env.SUPER_ADMIN_EMAIL = 'admin@test.example.com';

// Platform user fixture used across suites (orders, wallets, admin).
if (!process.env.PLATFORM_USER_ID) process.env.PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Anti-bot middleware blocks "supertest" UA by default (contains "node-superagent").
// Use a neutral UA for all tests to avoid false positives.
if (!process.env.TEST_USER_AGENT) process.env.TEST_USER_AGENT = 'Mozilla/5.0 (TestRunner) AppleWebKit/537.36';

// Éviter MaxListenersExceededWarning (database.ts et autres ajoutent des listeners beforeExit)
process.setMaxListeners(20);

// Pas d’import dynamique au top-level : Jest/ts-jest rejette le top-level await sur ce fichier.
// On charge Prisma dans beforeAll et on expose un Proxy pour que `import { prisma } from './setup.js'`
// reste valide partout dans les suites.
function getPrismaInstance(): PrismaClient {
  const inst = (global as any).__PRISMA__ as PrismaClient | undefined;
  if (!inst) {
    throw new Error(
      "[jest setup] Prisma n'est pas initialisé : le beforeAll du setup doit s'exécuter avant tout accès à prisma."
    );
  }
  return inst;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const inst = getPrismaInstance();
    const v = (inst as any)[prop];
    return typeof v === 'function' ? v.bind(inst) : v;
  },
}) as PrismaClient;

beforeAll(async () => {
  const { default: client } = await import('../src/config/database.js');
  (global as any).__PRISMA__ = client;

  const maxAttempts = 10;
  const delayMs = 3000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.$queryRaw`SELECT 1`;
      break;
    } catch (error: any) {
      if (attempt === maxAttempts) {
        console.error('Erreur de connexion à la base de données de test:', error);
        throw error;
      }
      if (process.env.DEBUG_TEST_SETUP === '1') {
        console.warn(
          `DB test indisponible (tentative ${attempt}/${maxAttempts}), nouvel essai dans ${delayMs}ms…`
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID!;
  try {
    const existing = await client.user.findUnique({ where: { id: PLATFORM_USER_ID } });
    if (!existing) {
      await client.user.create({
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
  } catch (err: any) {
    // Ignorer si l'email existe déjà (autre id) ou autre contrainte
    if (process.env.DEBUG_TEST_SETUP === '1') {
      console.warn('Erreur création utilisateur plateforme:', err.message);
    }
  }
}, 60000);

afterAll(async () => {
  const inst = (global as any).__PRISMA__ as PrismaClient | undefined;
  if (inst?.$disconnect) await inst.$disconnect();
});
