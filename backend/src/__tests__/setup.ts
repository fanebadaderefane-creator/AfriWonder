/**
 * Setup pour les tests dans src/__tests__/
 * Utilise le MÊME prisma que l'application (database.ts) pour éviter
 * les conflits de pool et les erreurs de clés étrangères.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Charger .env.test (même résolution que __tests__/setup.ts)
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), 'backend', '.env.test'),
  path.resolve(currentDir, '..', '..', '.env.test'),
];

const resolvedEnvPath = envCandidates.find((p) => fs.existsSync(p));
if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath, override: true });
} else {
  dotenv.config({ override: true });
}

// Utiliser le même prisma que l'application
import prisma from '../config/database.js';

(global as any).__PRISMA__ = prisma;

export { prisma };
