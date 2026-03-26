/**
 * Re-scan les vidéos déjà sur notre CDN : ffprobe + ré-encodage H.264 yuv420p si besoin (Firefox / WebView).
 * Les nouveaux uploads passent déjà par maybeTranscodeMp4BufferForWeb + scheduleCompatTranscodeAfterPublish.
 *
 * Prérequis : DATABASE_URL, R2_*, ffmpeg/ffprobe (comme l’API prod).
 *
 * Usage :
 *   npx tsx scripts/backfill-video-web-compat.ts --limit=50
 *   npx tsx scripts/backfill-video-web-compat.ts --limit=20 --skip=100 --dry-run
 *   npx tsx scripts/backfill-video-web-compat.ts --ids=UUID1,UUID2 --force
 *   (--force = ré-encoder toutes les vidéos ciblées, même si ffprobe dit « compatible »)
 */

import 'dotenv/config';
import prisma from '../src/config/database.js';
import {
  forceWebCompatTranscodePublishedVideo,
  runCompatTranscodeForPublishedVideo,
} from '../src/services/videoCompatTranscode.service.js';

function argNum(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
  const n = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const limit = Math.max(1, argNum('--limit', 50));
  const skip = Math.max(0, argNum('--skip', 0));
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const idsRaw = process.argv.find((a) => a.startsWith('--ids='))?.slice('--ids='.length);
  const idList = idsRaw
    ? idsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const videos =
    idList.length > 0
      ? await prisma.video.findMany({
          where: { id: { in: idList }, video_url: { not: null } },
          select: { id: true, video_url: true, created_at: true },
          orderBy: { created_at: 'asc' },
        })
      : await prisma.video.findMany({
          where: {
            visibility: 'public',
            media_type: 'video',
            video_url: { not: null },
          },
          select: { id: true, video_url: true, created_at: true },
          orderBy: { created_at: 'asc' },
          skip,
          take: limit,
        });

  console.log(
    `backfill-video-web-compat: ${videos.length} vidéo(s)${idList.length ? ` (ids=${idList.length})` : ` (skip=${skip}, limit=${limit})`}${force ? ' [force]' : ''}${dryRun ? ' [dry-run]' : ''}`
  );

  for (const v of videos) {
    const url = v.video_url!;
    if (dryRun) {
      console.log('[dry-run]', v.id, url);
      continue;
    }
    if (force) {
      const r = await forceWebCompatTranscodePublishedVideo(v.id);
      console.log('traité', v.id, r.ok ? 'OK' : r.skipped || r.error || 'échec');
    } else {
      await runCompatTranscodeForPublishedVideo(v.id, url);
      console.log('traité', v.id);
    }
  }

  console.log('Terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
