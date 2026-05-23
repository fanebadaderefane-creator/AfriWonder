/**
 * Script pour corriger toutes les URLs vidéo
 * - Corrige les URLs avec cdn.afriwonder.com (non configuré)
 * - Corrige les URLs R2 dev sans le préfixe /videos/
 * 
 * Usage: npx tsx backend/scripts/fix-all-video-urls.ts
 */

import prisma from '../src/config/database.js';

const R2_DEV_URL = 'https://pub-e025f1eec1f248ef91c99a64d9cbb328.r2.dev';

async function fixAllVideoUrls() {
  console.log('🔧 Correction de toutes les URLs vidéo...\n');

  try {
    // Récupérer toutes les vidéos
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        video_url: true,
      },
    });

    if (videos.length === 0) {
      console.log('✅ Aucune vidéo dans la base de données.\n');
      return;
    }

    console.log(`📊 ${videos.length} vidéo(s) trouvée(s)\n`);

    let updatedCount = 0;

    for (const video of videos) {
      let needsUpdate = false;
      let newUrl = video.video_url;

      // Problème 1: URL avec cdn.afriwonder.com (non configuré)
      if (video.video_url.includes('cdn.afriwonder.com')) {
        console.log(`📹 ${video.title} (ID: ${video.id})`);
        console.log(`   ❌ URL avec cdn.afriwonder.com (non configuré)`);
        
        // Extraire le nom du fichier
        const match = video.video_url.match(/videos\/(.+)$/);
        if (match) {
          const fileName = match[1];
          newUrl = `${R2_DEV_URL}/videos/${fileName}`;
          needsUpdate = true;
          console.log(`   ✅ Nouvelle URL: ${newUrl}`);
        } else {
          console.log(`   ⚠️ Impossible d'extraire le nom du fichier`);
        }
      }
      // Problème 2: URL R2 dev sans /videos/
      else if (video.video_url.includes('r2.dev') && !video.video_url.includes('/videos/')) {
        console.log(`📹 ${video.title} (ID: ${video.id})`);
        console.log(`   ❌ URL R2 dev sans préfixe /videos/`);
        
        // Extraire le nom du fichier
        const match = video.video_url.match(/r2\.dev\/(.+)$/);
        if (match) {
          const fileName = match[1];
          newUrl = `${R2_DEV_URL}/videos/${fileName}`;
          needsUpdate = true;
          console.log(`   ✅ Nouvelle URL: ${newUrl}`);
        } else {
          console.log(`   ⚠️ Impossible d'extraire le nom du fichier`);
        }
      }

      // Mettre à jour si nécessaire
      if (needsUpdate && newUrl !== video.video_url) {
        await prisma.video.update({
          where: { id: video.id },
          data: { video_url: newUrl },
        });
        console.log(`   ✅ Mise à jour effectuée\n`);
        updatedCount++;
      } else if (!needsUpdate) {
        console.log(`✅ ${video.title}: URL déjà correcte`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Correction terminée: ${updatedCount} vidéo(s) corrigée(s)\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAllVideoUrls()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

