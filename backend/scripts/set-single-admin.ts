/**
 * Script one-shot : définir le seul admin de la plateforme.
 * - Met à jour ou crée le compte avec l'email ci-dessous en super_admin et définit le mot de passe.
 * - Révoque tous les autres rôles admin (admin, super_admin, finance_admin, etc.) → role = 'user'
 *
 * Usage (depuis backend/) :
 *   npx tsx scripts/set-single-admin.ts
 *
 * Optionnel : définir le mot de passe par variable d'environnement (recommandé)
 *   set ADMIN_PASSWORD=Mali@202520211215
 *   npx tsx scripts/set-single-admin.ts
 *
 * Sinon le script utilise le mot de passe par défaut ci-dessous (à changer après première connexion si besoin).
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/database.js';

const ADMIN_EMAIL = 'fanebadaderefane@gmail.com';
const DEFAULT_PASSWORD = 'Mali@202520211215';

const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'finance_admin',
  'moderation_admin',
  'support_admin',
  'data_admin',
];

async function main() {
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Mot de passe requis (min 8 caractères). Utilisez ADMIN_PASSWORD=... ou le défaut dans le script.');
  }

  const password_hash = await bcrypt.hash(password, 10);

  // 1) Révoquer tous les rôles admin pour les autres utilisateurs
  const revoked = await prisma.user.updateMany({
    where: {
      email: { not: ADMIN_EMAIL },
      role: { in: ADMIN_ROLES },
    },
    data: { role: 'user' },
  });
  console.log(`✅ Rôles admin révoqués pour ${revoked.count} autre(s) utilisateur(s).`);

  // 2) Trouver ou créer le compte admin
  let user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'super_admin', password_hash },
    });
    console.log(`✅ Compte existant mis à jour : ${ADMIN_EMAIL} → super_admin (mot de passe mis à jour).`);
  } else {
    const username =
      ADMIN_EMAIL.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'superadmin';
    let uniqueUsername = username;
    let n = 0;
    while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
      uniqueUsername = `${username}${++n}`;
    }
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        username: uniqueUsername,
        password_hash,
        role: 'super_admin',
      },
    });
    console.log(`✅ Compte créé : ${ADMIN_EMAIL} (username: ${uniqueUsername}) → super_admin.`);
  }

  console.log('\nTu es le seul admin. Connexion :', ADMIN_EMAIL);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
