/**
 * Script pour renommer un fichier vidéo sur R2 avec un nom propre
 * 
 * Étapes :
 * 1. Télécharger le fichier depuis R2
 * 2. Le renommer avec un nom ASCII-safe
 * 3. Le réuploader avec le nouveau nom
 * 4. Supprimer l'ancien fichier
 * 5. Mettre à jour l'URL dans la DB
 * 
 * Usage: npx tsx backend/scripts/rename-video-on-r2.ts <video-id>
 */

import prisma from '../src/config/database.js';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../src/config/cloudflare-r2.js';

/**
 * Crée un nom de fichier ASCII-safe
 */
function createSafeFilename(originalName: string): string {
  if (!originalName) return 'file';

  const lastDot = originalName.lastIndexOf('.');
  const extension = lastDot !== -1 ? originalName.slice(lastDot) : '';
  const nameWithoutExt = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;

  // Extraire le timestamp si présent (format: timestamp-filename.ext)
  const timestampMatch = nameWithoutExt.match(/^(\d+)-(.+)$/);
  const timestamp = timestampMatch ? timestampMatch[1] + '-' : '';
  const actualName = timestampMatch ? timestampMatch[2] : nameWithoutExt;

  // Normaliser Unicode (décompose accents)
  let safe = actualName.normalize('NFD');

  // Supprimer les accents (combining marks)
  safe = safe.replace(/[\u0300-\u036f]/g, '');

  // Remplacer tout caractère non ASCII safe
  safe = safe
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  if (!safe) safe = 'video';

  return timestamp + safe + extension.toLowerCase();
}

async function renameVideoOnR2(videoId?: string) {
  console.log('🔄 Renommage du fichier vidéo sur R2...\n');

  try {
    // 1. Récupérer la vidéo
    let video;
    if (videoId) {
      video = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          id: true,
          title: true,
          video_url: true,
        },
      });
    } else {
      // Prendre la première vidéo avec URL cassée
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
        take: 1,
      });
      video = videos[0];
    }

    if (!video) {
      console.log('❌ Aucune vidéo trouvée.\n');
      return;
    }

    console.log(`📹 Vidéo: ${video.title} (ID: ${video.id})`);
    console.log(`   URL actuelle: ${video.video_url}\n`);

    // 2. Extraire le nom du fichier de l'URL
    let oldFileName: string;
    try {
      const url = new URL(video.video_url);
      const pathParts = url.pathname.split('/');
      oldFileName = decodeURIComponent(pathParts[pathParts.length - 1]);
    } catch {
      // Si l'URL est cassée, essayer d'extraire directement
      const match = video.video_url.match(/videos\/(.+)$/);
      if (!match) {
        console.log('❌ Impossible d\'extraire le nom du fichier de l\'URL\n');
        return;
      }
      oldFileName = decodeURIComponent(match[1]);
    }

    console.log(`📁 Nom actuel sur R2: ${oldFileName}`);

    // 3. Créer un nouveau nom propre
    const newFileName = createSafeFilename(oldFileName);
    console.log(`✨ Nouveau nom: ${newFileName}\n`);

    if (oldFileName === newFileName) {
      console.log('✅ Le nom est déjà propre, pas besoin de renommer.\n');
      return;
    }

    // 4. Copier le fichier avec le nouveau nom (plus efficace que download/upload)
    console.log('📦 Copie du fichier sur R2...');
    const copyCommand = new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      CopySource: `${R2_BUCKET_NAME}/videos/${encodeURIComponent(oldFileName)}`,
      Key: `videos/${newFileName}`,
    });

    await r2Client.send(copyCommand);
    console.log('✅ Fichier copié avec le nouveau nom\n');

    // 5. Construire la nouvelle URL
    const encodedNewFileName = encodeURIComponent(newFileName);
    const newUrl = `${R2_PUBLIC_URL}/videos/${encodedNewFileName}`;
    console.log(`🔧 Nouvelle URL: ${newUrl}\n`);

    // 6. Mettre à jour dans la DB
    console.log('💾 Mise à jour de la base de données...');
    await prisma.video.update({
      where: { id: video.id },
      data: { video_url: newUrl },
    });
    console.log('✅ URL mise à jour dans la DB\n');

    // 7. Supprimer l'ancien fichier
    console.log('🗑️ Suppression de l\'ancien fichier...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `videos/${oldFileName}`,
    });

    await r2Client.send(deleteCommand);
    console.log('✅ Ancien fichier supprimé\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Renommage terminé avec succès !\n');
    console.log(`📹 Vidéo: ${video.title}`);
    console.log(`🔗 Nouvelle URL: ${newUrl}\n`);

  } catch (error: any) {
    console.error('❌ Erreur lors du renommage:', error);
    
    if (error.name === 'NoSuchKey') {
      console.log('\n💡 Le fichier n\'existe pas sur R2 avec ce nom.');
      console.log('   Solution: Supprimer la vidéo de la DB et la réuploader.\n');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 Problème de permissions R2.');
      console.log('   Vérifiez que les credentials R2 sont corrects.\n');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Récupérer l'ID de la vidéo depuis les arguments
const videoId = process.argv[2];

// Exécuter le script
renameVideoOnR2(videoId)
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

