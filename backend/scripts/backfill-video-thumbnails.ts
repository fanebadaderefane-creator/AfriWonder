// Backfill des miniatures vidéo pour AfriWonder.
// Génère une thumbnail pour chaque vidéo sans `thumbnail_url` en utilisant ffmpeg,
// puis l'upload dans R2, comme l'upload /api/upload/video.

import prisma from '../src/config/database.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../src/config/cloudflare-r2.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const protocol = url.startsWith('https') ? await import('https') : await import('http');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    protocol
      .get(url, (res: any) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return downloadToFile(res.headers.location, destPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err: any) => {
        file.close();
        reject(err);
      });
  });
}

async function generateThumbnailFromUrl(videoUrl: string, baseName: string): Promise<string | undefined> {
  if (!r2Client || !R2_PUBLIC_URL || !R2_BUCKET_NAME) return undefined;

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `${Date.now()}-${baseName}-src.tmp`);
  const outputPath = path.join(tmpDir, `${Date.now()}-${baseName}-thumb.jpg`);

  try {
    await downloadToFile(videoUrl, inputPath);

    const ffmpegArgs = [
      '-y',
      '-i',
      inputPath,
      '-ss',
      '00:00:01.000',
      '-vframes',
      '1',
      '-vf',
      'scale=720:-1:force_original_aspect_ratio=decrease',
      outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', ffmpegArgs);
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    const thumbBuffer = await fs.promises.readFile(outputPath);
    const fileNameSafe = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase() || 'video';
    const thumbFileName = `${Date.now()}-${fileNameSafe}-thumb.jpg`;
    const thumbKey = `thumbnails/${thumbFileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const encodedThumbName = encodeURIComponent(thumbFileName);
    const thumbUrl = `${R2_PUBLIC_URL}/thumbnails/${encodedThumbName}`;
    return thumbUrl;
  } catch (err) {
    console.error('Thumbnail generation failed for', videoUrl, err);
    return undefined;
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
}

async function main() {
  if (!R2_PUBLIC_URL || !R2_BUCKET_NAME || !r2Client) {
    console.error('R2 non configuré correctement, impossible de générer les miniatures.');
    process.exit(1);
  }

  const batchSize = 20;
  let page = 0;
  let processed = 0;

  // On cible uniquement les vidéos avec une URL vidéo définie (non vide) et sans thumbnail (NULL ou chaîne vide).
  for (;;) {
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { thumbnail_url: null },
          { thumbnail_url: '' },
        ],
        // Avec le schéma Prisma actuel, `video_url` est non nul côté DB, mais on évite les chaînes vides.
        video_url: { not: '' },
      },
      select: {
        id: true,
        title: true,
        video_url: true,
      },
      skip: page * batchSize,
      take: batchSize,
    });

    if (videos.length === 0) break;

    for (const v of videos) {
      const url = v.video_url as string | null;
      if (!url) continue;
      console.log(`[*] Génération thumbnail pour vidéo ${v.id} (${v.title || ''})`);
      const baseName = v.id;
      const thumbUrl = await generateThumbnailFromUrl(url, baseName);
      if (thumbUrl) {
        await prisma.video.update({
          where: { id: v.id },
          data: { thumbnail_url: thumbUrl },
        });
        processed += 1;
        console.log(`    -> OK: ${thumbUrl}`);
      } else {
        console.log('    -> échec, thumbnail non générée');
      }
    }

    page += 1;
  }

  console.log(`Terminé. Miniatures générées pour ${processed} vidéos.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erreur backfill thumbnails', err);
  prisma.$disconnect().finally(() => process.exit(1));
});

