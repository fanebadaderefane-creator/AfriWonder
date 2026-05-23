/**
 * Remet à zéro le solde disponible du wallet principal (live / cadeaux).
 * Usage (depuis backend/) :
 *   npx tsx scripts/reset-user-wallet-zero.ts ton-email@domaine.com
 * ou :
 *   RESET_WALLET_EMAIL=ton-email@domaine.com npm run wallet:zero-local
 *
 * Refusé si NODE_ENV=production sauf ALLOW_WALLET_RESET=1.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

import prisma from '../src/config/database.js';
import ledgerService from '../src/services/ledger.service.js';

async function main() {
  const raw = (process.env.RESET_WALLET_EMAIL || process.argv[2] || '').trim();
  if (!raw) {
    console.error('Indique l’email du compte :');
    console.error('  npx tsx scripts/reset-user-wallet-zero.ts email@example.com');
    console.error('ou RESET_WALLET_EMAIL=... npm run wallet:zero-local');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_WALLET_RESET !== '1') {
    console.error('Refusé en production. Pour forcer : ALLOW_WALLET_RESET=1 (à utiliser avec prudence).');
    process.exit(1);
  }

  const user =
    (await prisma.user.findUnique({ where: { email: raw }, select: { id: true, email: true } })) ||
    (await prisma.user.findUnique({
      where: { email: raw.toLowerCase() },
      select: { id: true, email: true },
    }));
  if (!user) {
    console.error(`Aucun utilisateur avec l’email : ${raw}`);
    process.exit(1);
  }

  const wallet = await prisma.wallet.findFirst({
    where: { user_id: user.id, wallet_type: 'user' },
  });
  if (!wallet) {
    console.log('Pas de wallet « user » ; solde déjà inexistant.');
    return;
  }

  const amt = Number(wallet.available_balance ?? 0);
  if (amt <= 0) {
    console.log(`Solde disponible déjà à zéro (available_balance=${wallet.available_balance}).`);
    return;
  }

  await ledgerService.debit(wallet.id, amt, {
    referenceType: 'other',
    description: 'Remise à zéro (script reset-user-wallet-zero.ts)',
  });

  console.log(`OK — ${amt} FCFA débités pour ${user.email}. Solde disponible : 0.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
