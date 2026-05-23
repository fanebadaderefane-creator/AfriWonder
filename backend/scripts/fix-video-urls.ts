/**
 * Script de migration ONE-SHOT pour corriger les URLs doublement encodées
 * 
 * Usage: npx tsx scripts/fix-video-urls.ts
 * 
 * ⚠️ À exécuter UNE SEULE FOIS après la correction de l'architecture
 */

import prisma from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

/**
 * Normalise une URL (même logique que VideoService.normalizeUrl)
 */
function normalizeUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const filename = parts.pop();

    if (!filename) return url;

    // Décoder récursivement si nécessaire
    let decoded = filename;
    let previous = '';
    let maxIterations = 5;
    
    for (let i = 0; i < maxIterations; i++) {
      previous = decoded;
      try {
        const temp = decodeURIComponent(decoded);
        if (temp === decoded) break;
        decoded = temp;
      } catch {
        break;
      }
    }

    // Réencoder proprement
    const safeFilename = encodeURIComponent(decoded);
    parts.push(safeFilename);
    u.pathname = parts.join('/');

    return u.toString();
  } catch {
    return url;
  }
}

async function fixVideoUrls() {
  try {
    logger.info('Début de la migration des URLs vidéo...');

    const videos = await prisma.video.findMany({
      select: {
        id: true,
        video_url: true,
        thumbnail_url: true,
      },
    });

    logger.info(`Trouvé ${videos.length} vidéos à vérifier`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      try {
        const fixedVideoUrl = normalizeUrl(video.video_url);
        const fixedThumbnailUrl = video.thumbnail_url 
          ? normalizeUrl(video.thumbnail_url) 
          : video.thumbnail_url;

        // Mettre à jour seulement si l'URL a changé
        if (fixedVideoUrl !== video.video_url || fixedThumbnailUrl !== video.thumbnail_url) {
          await prisma.video.update({
            where: { id: video.id },
            data: {
              video_url: fixedVideoUrl,
              ...(fixedThumbnailUrl !== video.thumbnail_url && {
                thumbnail_url: fixedThumbnailUrl,
              }),
            },
          });

          fixedCount++;
          logger.info(`✅ Vidéo ${video.id} corrigée`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`❌ Erreur pour la vidéo ${video.id}:`, error);
      }
    }

    logger.info(`Migration terminée:`);
    logger.info(`  - ${fixedCount} vidéos corrigées`);
    logger.info(`  - ${errorCount} erreurs`);
    logger.info(`  - ${videos.length - fixedCount - errorCount} vidéos déjà correctes`);

  } catch (error) {
    logger.error('Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
fixVideoUrls()
  .then(() => {
    logger.info('Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script échoué:', error);
    process.exit(1);
  });

