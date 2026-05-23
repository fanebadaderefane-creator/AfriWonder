/**
 * Nettoyage des lives de test en base avant mise en production.
 *
 * Compte (sans supprimer) :
 *   DRY_RUN=1 npx tsx scripts/cleanup-test-lives.ts --all-ended
 *   DRY_RUN=1 npx tsx scripts/cleanup-test-lives.ts --creator-id <UUID>
 *
 * Supprime tous les lives terminés (tous créateurs) :
 *   CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --all-ended
 *
 * Supprime uniquement les replays terminés d’un créateur (compte de test) :
 *   CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --creator-id <UUID>
 *
 * Supprime tous les streams d’un créateur (live + ended) — réservé au compte test :
 *   CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --creator-id <UUID> --include-live
 *
 * Lister les UUID créateurs ayant des replays terminés (sans supprimer) :
 *   npx tsx scripts/cleanup-test-lives.ts --list-ended
 *
 * Sans UUID : ton identifiant AfriWonder (email ou pseudo) :
 *   CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --email ton@email.com
 *   CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --username tonpseudo
 *
 * npm : npm run cleanup:lives -- --all-ended
 */

import 'dotenv/config';
import prisma from '../src/config/database.js';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

const hasFlag = (f: string) => argv.includes(f);

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const CONFIRM = process.env.CONFIRM_LIVE_CLEANUP === 'YES';

async function listEndedByCreator() {
  const grouped = await prisma.liveStream.groupBy({
    by: ['creator_id'],
    where: { status: 'ended' },
    _count: { id: true },
  });
  if (grouped.length === 0) {
    console.log('Aucun live au statut « ended » en base.');
    return;
  }
  grouped.sort((a, b) => b._count.id - a._count.id);
  const ids = grouped.map((g) => g.creator_id);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, email: true, full_name: true },
  });
  const umap = new Map(users.map((u) => [u.id, u]));
  console.log('Replays terminés (status=ended) par créateur — copie le creator_id pour --creator-id :\n');
  console.log('┌───────┬──────────────────────────────────────────────────────────┬──────────────────────────┐');
  console.log('│ count │ @username / nom / email                                    │ creator_id (UUID)        │');
  console.log('├───────┼──────────────────────────────────────────────────────────┼──────────────────────────┤');
  let total = 0;
  for (const g of grouped) {
    total += g._count.id;
    const u = umap.get(g.creator_id);
    const label = u
      ? `${u.username ?? '?'} · ${(u.full_name || '').slice(0, 24)} · ${u.email ?? '—'}`
      : '(user introuvable)';
    const n = String(g._count.id).padStart(5);
    const line = `│ ${n} │ ${label.slice(0, 58).padEnd(58)} │ ${g.creator_id} │`;
    console.log(line);
  }
  console.log('└───────┴──────────────────────────────────────────────────────────┴──────────────────────────┘');
  console.log(`\nTotal replays ended : ${total}  (${grouped.length} créateur(s))`);
}

async function resolveCreatorIdFromAccount(): Promise<{
  creatorId: string;
  label: string;
} | null> {
  const emailArg = getArg('--email')?.trim();
  const usernameArg = getArg('--username')?.trim();
  const creatorIdRaw = getArg('--creator-id')?.trim();

  const n = [creatorIdRaw, emailArg, usernameArg].filter(Boolean).length;
  if (n > 1) {
    console.error('Utilisez un seul parmi : --creator-id, --email, --username');
    process.exit(1);
  }

  if (emailArg) {
    const u = await prisma.user.findFirst({
      where: { email: { equals: emailArg, mode: 'insensitive' } },
      select: { id: true, username: true, email: true },
    });
    if (!u) {
      console.error(`Aucun utilisateur avec l’email : ${emailArg}`);
      process.exit(1);
    }
    return { creatorId: u.id, label: `${u.email} (@${u.username})` };
  }

  if (usernameArg) {
    const u = await prisma.user.findFirst({
      where: { username: { equals: usernameArg, mode: 'insensitive' } },
      select: { id: true, username: true, email: true },
    });
    if (!u) {
      console.error(`Aucun utilisateur avec le pseudo : ${usernameArg}`);
      process.exit(1);
    }
    return { creatorId: u.id, label: `${u.email} (@${u.username})` };
  }

  if (creatorIdRaw) {
    if (!/^[0-9a-f-]{36}$/i.test(creatorIdRaw)) {
      console.error('UUID créateur invalide. Utilise --email ou --username si tu n’as pas l’UUID.');
      process.exit(1);
    }
    return { creatorId: creatorIdRaw, label: creatorIdRaw };
  }

  return null;
}

async function main() {
  const listEnded = hasFlag('--list-ended');
  const allEnded = hasFlag('--all-ended');
  const includeLive = hasFlag('--include-live');

  if (listEnded) {
    await listEndedByCreator();
    return;
  }

  if (allEnded && (getArg('--creator-id') || getArg('--email') || getArg('--username'))) {
    console.error('Ne pas combiner --all-ended avec --creator-id / --email / --username.');
    process.exit(1);
  }

  const resolved = await resolveCreatorIdFromAccount();

  if (!allEnded && !resolved) {
    console.log(`
Nettoyage lives (test / pré-prod)

  Sans UUID — ton compte (recommandé) :
  CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --email ton@email.com
  CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --username tonpseudo
  (avec --include-live pour effacer aussi les lives encore « live » sur ce compte)

  npx tsx scripts/cleanup-test-lives.ts --list-ended
    → Liste les replays par créateur (pseudo / email / UUID).

  DRY_RUN=1 npx tsx scripts/cleanup-test-lives.ts --all-ended
  CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --all-ended

  CONFIRM_LIVE_CLEANUP=YES npx tsx scripts/cleanup-test-lives.ts --creator-id <UUID>

Sans DRY_RUN, CONFIRM_LIVE_CLEANUP=YES est obligatoire pour supprimer.
`);
    process.exit(1);
  }

  if (includeLive && !resolved) {
    console.error('--include-live nécessite --email, --username ou --creator-id.');
    process.exit(1);
  }

  const creatorId = resolved?.creatorId;

  const where: { status?: string; creator_id?: string } = {};
  if (allEnded) {
    where.status = 'ended';
  } else if (creatorId) {
    where.creator_id = creatorId;
    if (!includeLive) {
      where.status = 'ended';
    }
  }

  const count = await prisma.liveStream.count({ where });
  if (resolved) {
    console.log(`Compte : ${resolved.label}`);
  }
  console.log(`Lives correspondants : ${count}`);

  if (count === 0) {
    return;
  }

  if (DRY_RUN) {
    console.log('[DRY_RUN] Aucune suppression. Enlever DRY_RUN et définir CONFIRM_LIVE_CLEANUP=YES pour exécuter.');
    return;
  }

  if (!CONFIRM) {
    console.error('Refusé : définissez CONFIRM_LIVE_CLEANUP=YES pour exécuter la suppression.');
    process.exit(1);
  }

  const r = await prisma.liveStream.deleteMany({ where });
  console.log(`Supprimé : ${r.count} ligne(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
