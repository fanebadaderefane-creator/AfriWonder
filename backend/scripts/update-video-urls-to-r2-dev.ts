/**
 * Script pour mettre à jour les URLs vidéo avec la nouvelle URL R2 dev
 * 
 * Usage: npx tsx backend/scripts/update-video-urls-to-r2-dev.ts
 */

import prisma from '../src/config/database.js';

const R2_DEV_URL = 'https://pub-e025f1eec1f248ef91c99a64d9cbb328.r2.dev';

async function updateVideoUrlsToR2Dev() {
  console.log('🔧 Mise à jour des URLs vidéo avec l\'URL R2 dev...\n');

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
      // Extraire le nom du fichier de l'URL actuelle
      let fileName: string;
      try {
        const url = new URL(video.video_url);
        const pathParts = url.pathname.split('/');
        fileName = decodeURIComponent(pathParts[pathParts.length - 1]);
      } catch {
        // Si l'URL est cassée, essayer d'extraire directement
        const match = video.video_url.match(/videos\/(.+)$/);
        if (!match) {
          console.log(`⚠️ Impossible d'extraire le nom du fichier pour: ${video.title}`);
          continue;
        }
        fileName = decodeURIComponent(match[1]);
      }

      // Construire la nouvelle URL R2 dev
      const encodedFileName = encodeURIComponent(fileName);
      const newUrl = `${R2_DEV_URL}/${encodedFileName}`;

      if (video.video_url === newUrl) {
        console.log(`✅ ${video.title}: URL déjà correcte`);
        continue;
      }

      console.log(`📹 ${video.title}`);
      console.log(`   Ancienne: ${video.video_url}`);
      console.log(`   Nouvelle: ${newUrl}`);

      // Mettre à jour
      await prisma.video.update({
        where: { id: video.id },
        data: { video_url: newUrl },
      });

      console.log(`   ✅ Mise à jour effectuée\n`);
      updatedCount++;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Mise à jour terminée: ${updatedCount} vidéo(s) mise(s) à jour\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateVideoUrlsToR2Dev()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

