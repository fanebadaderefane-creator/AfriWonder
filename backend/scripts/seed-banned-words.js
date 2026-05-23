/**
 * Seed uniquement les mots interdits (CPO 2.43).
 * N'utilise pas Prisma, donc fonctionne même en cas de drift schéma/DB sur User, etc.
 * Usage: node scripts/seed-banned-words.js
 */
import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL manquant.');
  process.exit(1);
}

const BANNED_WORDS = ['spam', 'scam', 'arnaque', 'hack', 'piratage'];

async function main() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    for (const word of BANNED_WORDS) {
      const w = word.trim().toLowerCase();
      if (w.length < 2) continue;
      await client.query(
        `INSERT INTO "BannedWord" (id, word, is_active, created_at)
         VALUES (gen_random_uuid()::text, $1, true, NOW())
         ON CONFLICT (word) DO NOTHING`,
        [w]
      );
    }
    console.log('✅ Mots interdits (BannedWord) seedés:', BANNED_WORDS.length);
  } catch (err) {
    console.error('Erreur (table BannedWord absente?):', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
