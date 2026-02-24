/**
 * Script one-shot : supprimer les utilisateurs E2E / test et le compte "AfriWonder Demo".
 * Utilise le même flux que la suppression de compte (anonymisation + suppression des données).
 *
 * Usage (depuis backend/) :
 *   npx tsx scripts/delete-e2e-test-users.ts
 *
 * Pour un essai à blanc (affiche les utilisateurs sans supprimer) :
 *   DRY_RUN=1 npx tsx scripts/delete-e2e-test-users.ts
 */

import 'dotenv/config';
import prisma from '../src/config/database.js';
// @ts-ignore - default export
import privacyService from '../src/services/privacy.service.js';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const USERNAME_PATTERNS = [
  'login177',       // User Login E2E
  'e2euser177',    // Utilisateur E2E
  'checkoutuser',  // E2E Checkout User
  'payuser',       // E2E Payment User
  'walletuser',    // E2E Wallet User (username en minuscules en DB)
  'archuser',      // E2E Architecture User
  'first177',      // First User
  'err177',        // Error User
];

async function main() {
  const orConditions = [
    ...USERNAME_PATTERNS.map((p) => ({
      username: { contains: p, mode: 'insensitive' as const },
    })),
    { full_name: { contains: 'AfriWonder Demo', mode: 'insensitive' as const } },
    { full_name: { contains: 'E2E', mode: 'insensitive' as const } },
  ];

  const users = await prisma.user.findMany({
    where: { OR: orConditions },
    select: { id: true, username: true, email: true, full_name: true },
  });

  if (users.length === 0) {
    console.log('Aucun utilisateur E2E / test trouvé.');
    return;
  }

  console.log(`Utilisateurs trouvés : ${users.length}\n`);
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.full_name || '-'} @${u.username} (${u.email})`);
  });

  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Aucune suppression effectuée. Relancez sans DRY_RUN=1 pour supprimer.');
    return;
  }

  console.log('\nSuppression en cours...');
  let ok = 0;
  let err = 0;
  for (const user of users) {
    try {
      await privacyService.permanentlyDeleteAccount(user.id);
      console.log(`  ✅ ${user.username}`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${user.username}:`, (e as Error).message);
      err++;
    }
  }
  console.log(`\nRésultat : ${ok} supprimé(s), ${err} erreur(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
