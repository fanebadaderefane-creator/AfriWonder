/**
 * Supprime les anciens Moments cassés (tests E2E, images dev locales, URLs mortes).
 *
 * Lister (dry-run, défaut) :
 *   npx tsx scripts/cleanup-broken-moments.ts
 *   npm run cleanup:moments
 *
 * Supprimer en base :
 *   CONFIRM_MOMENTS_CLEANUP=YES npx tsx scripts/cleanup-broken-moments.ts --execute
 *   CONFIRM_MOMENTS_CLEANUP=YES npm run cleanup:moments -- --execute
 */

import 'dotenv/config';
import prisma from '../src/config/database.js';
import {
  isBrokenImageOnlyMomentRow,
  isE2eTestAccountUser,
  momentRowIsDisplayable,
} from '../src/utils/momentFeedMedia.js';

const argv = process.argv.slice(2);
const EXECUTE = argv.includes('--execute');
const CONFIRM = process.env.CONFIRM_MOMENTS_CLEANUP === 'YES';
const DRY_RUN = !EXECUTE || !CONFIRM;

async function main() {
  const posts = await prisma.post.findMany({
    include: {
      user: { select: { id: true, email: true, username: true, full_name: true } },
      images: { orderBy: { position: 'asc' } },
      poll: true,
    },
    orderBy: { created_at: 'asc' },
    take: 5000,
  });

  const toDelete: { id: string; reason: string; user: string }[] = [];

  for (const post of posts) {
    const row = post as unknown as Record<string, unknown>;
    const label = post.user?.full_name || post.user?.username || post.user?.email || post.user_id;

    if (isE2eTestAccountUser(post.user)) {
      toDelete.push({ id: post.id, reason: 'compte E2E / @example.com', user: String(label) });
      continue;
    }

    if (isBrokenImageOnlyMomentRow(row)) {
      toDelete.push({ id: post.id, reason: 'image seule sans URL valide', user: String(label) });
      continue;
    }

    if (!momentRowIsDisplayable(row)) {
      toDelete.push({ id: post.id, reason: 'aucun contenu affichable', user: String(label) });
    }
  }

  const photoVideos = await prisma.video.findMany({
    where: { media_type: { in: ['image', 'photo'] } },
    include: {
      creator: { select: { id: true, email: true, username: true, full_name: true } },
    },
    take: 2000,
  });

  const videosToDelete: { id: string; reason: string; user: string }[] = [];
  for (const v of photoVideos) {
    const row = {
      text: [v.title, v.description].filter(Boolean).join('\n'),
      image_url: v.thumbnail_url || v.video_url,
      images: [],
      user: v.creator,
    } as Record<string, unknown>;
    if (isE2eTestAccountUser(v.creator)) {
      videosToDelete.push({ id: v.id, reason: 'photo E2E', user: String(v.creator.full_name || v.creator.username) });
    } else if (isBrokenImageOnlyMomentRow(row) || !momentRowIsDisplayable(row)) {
      videosToDelete.push({ id: v.id, reason: 'photo moment sans média valide', user: String(v.creator.full_name || v.creator.username) });
    }
  }

  console.log(`\nMoments à supprimer : ${toDelete.length} post(s), ${videosToDelete.length} photo(s) vidéo\n`);

  for (const item of toDelete.slice(0, 40)) {
    console.log(`  [post] ${item.id.slice(0, 8)}… — ${item.reason} — ${item.user}`);
  }
  if (toDelete.length > 40) console.log(`  … et ${toDelete.length - 40} autres posts`);

  for (const item of videosToDelete.slice(0, 20)) {
    console.log(`  [video-photo] ${item.id.slice(0, 8)}… — ${item.reason} — ${item.user}`);
  }
  if (videosToDelete.length > 20) console.log(`  … et ${videosToDelete.length - 20} autres photos`);

  if (DRY_RUN) {
    console.log('\nDry-run — rien supprimé. Pour exécuter :');
    console.log('  CONFIRM_MOMENTS_CLEANUP=YES npm run cleanup:moments -- --execute\n');
    return;
  }

  const postIds = toDelete.map((x) => x.id);
  const videoIds = videosToDelete.map((x) => x.id);

  if (postIds.length > 0) {
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  }
  if (videoIds.length > 0) {
    await prisma.video.deleteMany({ where: { id: { in: videoIds } } });
  }

  console.log(`\n✅ Supprimé : ${postIds.length} post(s), ${videoIds.length} photo(s) vidéo.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
