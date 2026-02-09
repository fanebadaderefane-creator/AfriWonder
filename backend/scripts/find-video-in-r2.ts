/**
 * Script pour trouver les fichiers vidéo réels sur R2
 * et corriger les URLs dans la base de données
 * 
 * Usage: npx tsx backend/scripts/find-video-in-r2.ts
 */

import prisma from '../src/config/database.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../src/config/cloudflare-r2.js';

async function findVideoInR2() {
  console.log('🔍 Recherche des fichiers vidéo sur R2...\n');

  try {
    // 1. Récupérer les vidéos avec URLs cassées
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        video_url: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const brokenVideos = videos.filter(v => 
      /Ã©|Ã¨|Ã |â\u0080\u0099|Ã§|Ãª|Ã®|Ã´|Ã»/i.test(v.video_url)
    );

    if (brokenVideos.length === 0) {
      console.log('✅ Aucune vidéo avec URL cassée trouvée.\n');
      return;
    }

    console.log(`📊 ${brokenVideos.length} vidéo(s) avec URL cassée trouvée(s)\n`);

    // 2. Lister tous les fichiers dans le bucket videos/
    console.log('📦 Liste des fichiers sur R2...\n');
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/',
    });

    const response = await r2Client.send(command);
    const r2Files = (response.Contents || [])
      .map(obj => obj.Key || '')
      .filter(key => key.endsWith('.mp4') || key.endsWith('.mov') || key.endsWith('.avi'))
      .map(key => key.replace('videos/', ''));

    console.log(`📁 ${r2Files.length} fichier(s) vidéo trouvé(s) sur R2\n`);

    if (r2Files.length === 0) {
      console.log('❌ Aucun fichier vidéo trouvé sur R2.\n');
      return;
    }

    // 3. Pour chaque vidéo cassée, essayer de trouver le fichier correspondant
    for (const video of brokenVideos) {
      console.log(`\n📹 Vidéo: ${video.title} (ID: ${video.id})`);
      console.log(`   URL cassée: ${video.video_url}`);

      // Extraire le timestamp de l'URL
      const timestampMatch = video.video_url.match(/(\d+)-/);
      if (!timestampMatch) {
        console.log(`   ❌ Impossible d'extraire le timestamp de l'URL`);
        continue;
      }

      const timestamp = timestampMatch[1];
      console.log(`   🔍 Recherche du fichier avec timestamp: ${timestamp}`);

      // Chercher les fichiers qui commencent par ce timestamp
      const matchingFiles = r2Files.filter(file => file.startsWith(timestamp + '-'));

      if (matchingFiles.length === 0) {
        console.log(`   ❌ Aucun fichier trouvé avec ce timestamp sur R2`);
        console.log(`   💡 Le fichier a peut-être été supprimé ou n'a jamais été uploadé`);
        continue;
      }

      if (matchingFiles.length === 1) {
        // Un seul fichier correspond - c'est probablement le bon
        const correctFileName = matchingFiles[0];
        const correctUrl = `${R2_PUBLIC_URL}/videos/${encodeURIComponent(correctFileName)}`;
        
        console.log(`   ✅ Fichier trouvé: ${correctFileName}`);
        console.log(`   🔧 URL corrigée: ${correctUrl}`);

        // Mettre à jour dans la DB
        await prisma.video.update({
          where: { id: video.id },
          data: { video_url: correctUrl },
        });

        console.log(`   ✅ URL mise à jour dans la base de données\n`);
      } else {
        // Plusieurs fichiers correspondent - afficher tous les candidats
        console.log(`   ⚠️ ${matchingFiles.length} fichier(s) trouvé(s) avec ce timestamp:`);
        matchingFiles.forEach((file, index) => {
          console.log(`      ${index + 1}. ${file}`);
        });
        console.log(`   💡 Veuillez vérifier manuellement quel fichier correspond à cette vidéo\n`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Recherche terminée\n');

  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
findVideoInR2()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

