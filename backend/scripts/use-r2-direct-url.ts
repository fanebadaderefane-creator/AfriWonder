/**
 * Script pour utiliser l'URL R2 directe au lieu du custom domain
 * 
 * Usage: npx tsx backend/scripts/use-r2-direct-url.ts
 */

import prisma from '../src/config/database.js';

const R2_DIRECT_PUBLIC_URL = 'https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/afriwonder';

async function useR2DirectUrl() {
  console.log('🔧 Mise à jour des URLs pour utiliser R2 direct...\n');

  try {
    // Récupérer toutes les vidéos
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        video_url: true,
      },
    });

    console.log(`📊 ${videos.length} vidéo(s) trouvée(s)\n`);

    for (const video of videos) {
      // Extraire le nom du fichier de l'URL
      let fileName: string;
      try {
        const url = new URL(video.video_url);
        const pathParts = url.pathname.split('/');
        fileName = pathParts[pathParts.length - 1];
      } catch {
        // Si l'URL est cassée, essayer d'extraire directement
        const match = video.video_url.match(/videos\/(.+)$/);
        if (!match) {
          console.log(`⚠️ Impossible d'extraire le nom du fichier pour: ${video.title}`);
          continue;
        }
        fileName = decodeURIComponent(match[1]);
      }

      // Construire la nouvelle URL R2 directe
      const encodedFileName = encodeURIComponent(fileName);
      const newUrl = `${R2_DIRECT_PUBLIC_URL}/videos/${encodedFileName}`;

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
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Mise à jour terminée\n');
    console.log('⚠️ NOTE:');
    console.log('   Les URLs utilisent maintenant l\'endpoint R2 direct.');
    console.log('   Pour utiliser cdn.afriwonder.com, configurez le custom domain dans Cloudflare R2.\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

useR2DirectUrl()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

