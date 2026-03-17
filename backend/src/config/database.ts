// AfriWonder full review PR - CodeRabbit
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Racine backend (src/config -> backend)
const backendRoot = path.resolve(currentDir, '..', '..');
const envPath = path.join(backendRoot, '.env');
const envExamplePath = path.join(backendRoot, '.env.example');

if (process.env.NODE_ENV === 'test') {
  const envTestCandidates = [
    path.join(backendRoot, '.env.test'),
    path.resolve(process.cwd(), '.env.test'),
    path.resolve(process.cwd(), 'backend', '.env.test'),
  ];
  const resolvedEnvPath = envTestCandidates.find((p) => fs.existsSync(p));
  if (resolvedEnvPath) {
    dotenv.config({ path: resolvedEnvPath, override: false });
  } else {
    dotenv.config({ override: false });
  }
} else {
  // Toujours charger backend/.env en priorité (évite "credentials (not available)" si cwd = racine projet)
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (process.env.NODE_ENV === 'development') {
      logger.info('Env chargé depuis backend/.env (DATABASE_URL présente: ' + (process.env.DATABASE_URL ? 'oui' : 'non') + ')');
    }
  } else if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath });
    if (process.env.NODE_ENV === 'development') {
      logger.warn('backend/.env absent, utilisation de .env.example — créez backend/.env avec DATABASE_URL, JWT_SECRET, etc.');
    }
  } else {
    dotenv.config();
  }
}

// Créer le pool de connexions PostgreSQL
let connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  logger.error('DATABASE_URL manquante. Fichier chargé: ' + (fs.existsSync(envPath) ? envPath : envExamplePath || 'aucun'));
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Bases cloud (Render, Supabase, Neon, etc.) exigent souvent SSL ; sans ça → "Authentication failed"
const isCloudHost = /\.(render\.com|supabase\.co|supabase\.com|neon\.tech|neon\.xyz|aws\.amazon|pooler\.)/i.test(connectionString);
// Avec le pool pg + ssl.rejectUnauthorized: false, ne jamais mettre sslmode dans l’URL :
// pg-connection-string traite sslmode=require comme verify-full → "self-signed certificate in certificate chain" sur Render/Supabase pooler.
// On garde SSL via le pool (rejectUnauthorized: false) pour dev et production.
if (isCloudHost && /sslmode=/i.test(connectionString)) {
  connectionString = connectionString
    .replace(/[?&]sslmode=[^&]*/gi, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '');
  logger.info('Connexion DB cloud : ssl via pool (rejectUnauthorized=false), sslmode retiré de l’URL');
}

// Pool size: pooler Supabase/Supavisor limite les connexions → petit pool (3).
// Connexion directe (db.xxx.supabase.co) → pool 5 en dev pour éviter circuit breaker au démarrage.
const connectionStringLower = (connectionString || '').toLowerCase();
const isPooler = /pooler\.|supavisor/i.test(connectionStringLower);

const poolMaxEnv = parseInt(process.env.DATABASE_POOL_MAX || '', 10);
const poolMax = Number.isFinite(poolMaxEnv) && poolMaxEnv > 0
  ? Math.min(poolMaxEnv, 100)
  : isPooler
    ? 3
    : (process.env.NODE_ENV === 'production' ? 20 : 10);

// Avec hôte cloud (Supabase pooler, Neon…), le certificat peut être rejeté ("self-signed certificate in certificate chain").
// On accepte la connexion TLS sans vérification stricte pour que Render/production puisse se connecter au pooler Supabase.
const pool = new Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s pour éviter timeout lors de l'init (politiques de rétention, etc.)
  ...(isCloudHost && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : process.env.NODE_ENV === 'test'
    ? []
    : ['error'],
});

// Connect to database (only in non-test environment; never exit in test).
// Exécuter une requête réelle après $connect() pour valider le pool (évite "Circuit breaker open" après le premier vrai query).
if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => prisma.$queryRaw`SELECT 1`)
    .then(() => {
      logger.info('✅ Database connected');
    })
    .catch((error) => {
      logger.error('❌ Database connection failed', error);
      process.exit(1);
    });
} else {
  // En mode test : pas de process.exit, connexion gérée par __tests__/setup.ts
  prisma.$connect().catch(() => {});
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
});

export default prisma;
