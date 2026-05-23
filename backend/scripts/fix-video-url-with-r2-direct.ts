/**
 * Script pour corriger l'URL vidéo en utilisant l'URL R2 directe
 * 
 * Le problème : Le fichier sur R2 a un nom cassé, mais on peut quand même y accéder
 * via l'URL R2 directe avec le bon encodage
 * 
 * Usage: npx tsx backend/scripts/fix-video-url-with-r2-direct.ts
 */

import prisma from '../src/config/database.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '../src/config/cloudflare-r2.js';

// URL R2 directe (sans custom domain)
// Format: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<file-path>
const R2_DIRECT_URL = process.env.R2_DIRECT_PUBLIC_URL || 'https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/afriwonder';

async function fixVideoUrlWithR2Direct() {
  console.log('🔧 Correction de l\'URL vidéo avec URL R2 directe...\n');

  try {
    // 1. Récupérer la vidéo avec URL cassée
    const videos = await prisma.video.findMany({
      where: {
        video_url: {
          contains: 'sonink',
        },
      },
      select: {
        id: true,
        title: true,
        video_url: true,
      },
    });

    if (videos.length === 0) {
      console.log('✅ Aucune vidéo à corriger.\n');
      return;
    }

    // 2. Lister les fichiers sur R2
    console.log('📦 Recherche du fichier sur R2...\n');
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/1770224677724-',
    });

    const response = await r2Client.send(command);
    const files = (response.Contents || [])
      .map(obj => obj.Key || '')
      .filter(Boolean);

    if (files.length === 0) {
      console.log('❌ Aucun fichier trouvé sur R2.\n');
      return;
    }

    const r2FileName = files[0].replace('videos/', '');
    console.log(`✅ Fichier trouvé sur R2: ${r2FileName}`);

    // 3. Construire l'URL R2 directe
    // Le nom du fichier sur R2 est cassé, mais on peut l'encoder pour l'URL
    const encodedFileName = encodeURIComponent(r2FileName);
    const r2DirectUrl = `${R2_DIRECT_URL}/videos/${encodedFileName}`;
    
    console.log(`🔧 URL R2 directe: ${r2DirectUrl}\n`);

    // 4. Mettre à jour dans la DB
    for (const video of videos) {
      console.log(`📹 Mise à jour de la vidéo: ${video.title} (ID: ${video.id})`);
      
      await prisma.video.update({
        where: { id: video.id },
        data: { video_url: r2DirectUrl },
      });

      console.log(`✅ URL mise à jour: ${r2DirectUrl}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Correction terminée\n');
    console.log('⚠️ NOTE IMPORTANTE:');
    console.log('   Cette URL utilise l\'endpoint R2 direct.');
    console.log('   Pour utiliser un custom domain (cdn.afriwonder.com),');
    console.log('   vous devez configurer le custom domain dans Cloudflare R2.\n');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
fixVideoUrlWithR2Direct()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

