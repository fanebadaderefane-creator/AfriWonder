/**
 * Chargement prioritaire de backend/.env — doit être importé en premier dans index.ts.
 *
 * Problèmes corrigés :
 * - En ESM, tout le graphe d’imports s’exécute avant le corps de index.ts : un ancien
 *   dotenv.config() placé plus bas dans index arrivait trop tard si un autre module lisait déjà process.env.
 * - Sur Windows, une variable d’environnement système `DATABASE_URL=` (vide) empêche
 *   dotenv (override: false) d’appliquer la valeur du fichier : on refait un passage avec override: true
 *   seulement si des clés critiques sont encore vides après la première lecture.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(backendRoot, '.env');
const envExamplePath = path.join(backendRoot, '.env.example');

function criticalEnvMissing(): boolean {
  return (
    !String(process.env.DATABASE_URL || '').trim() ||
    !String(process.env.JWT_SECRET || '').trim() ||
    !String(process.env.JWT_REFRESH_SECRET || '').trim()
  );
}

if (process.env.NODE_ENV !== 'test') {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    if (criticalEnvMissing()) {
      dotenv.config({ path: envPath, override: true });
    }
  } else if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath, override: false });
    if (criticalEnvMissing()) {
      dotenv.config({ path: envExamplePath, override: true });
    }
  } else {
    dotenv.config({ override: false });
  }
}
