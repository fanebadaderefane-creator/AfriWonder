/**
 * Script pour corriger les URLs vidéo avec encodage cassé
 * 
 * ⚠️ ATTENTION : Ce script tente de corriger les noms de fichiers cassés
 * en essayant de décoder l'encodage. Si le fichier n'existe pas sur R2,
 * il faudra supprimer la vidéo et la réuploader.
 * 
 * Usage: npx tsx backend/scripts/fix-broken-video-urls.ts
 */

import prisma from '../src/config/database.js';
import axios from 'axios';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../src/config/cloudflare-r2.js';

/**
 * Tente de corriger un nom de fichier avec encodage cassé
 */
function tryFixFilename(brokenUrl: string): string[] {
  const alternatives: string[] = [];
  
  try {
    const url = new URL(brokenUrl);
    const pathParts = url.pathname.split('/');
    const brokenFilename = pathParts[pathParts.length - 1];
    
    // Essayer différentes corrections d'encodage
    // 1. Essayer de décoder comme si c'était du latin1 mal interprété
    try {
      const decoded = Buffer.from(brokenFilename, 'latin1').toString('utf8');
      const fixed = encodeURIComponent(decoded);
      const newUrl = `${url.origin}${pathParts.slice(0, -1).join('/')}/${fixed}`;
      alternatives.push(newUrl);
    } catch {}
    
    // 2. Essayer de remplacer les caractères cassés connus
    const replacements: { [key: string]: string } = {
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã ': 'à',
      'â\u0080\u0099': "'",
      'Ã§': 'ç',
      'Ãª': 'ê',
      'Ã®': 'î',
      'Ã´': 'ô',
      'Ã»': 'û',
      'Ã‰': 'É',
      'Ãˆ': 'È',
      'Ã€': 'À',
      'Ã‡': 'Ç',
    };
    
    let fixed = brokenFilename;
    for (const [broken, correct] of Object.entries(replacements)) {
      fixed = fixed.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }
    
    if (fixed !== brokenFilename) {
      const encoded = encodeURIComponent(fixed);
      const newUrl = `${url.origin}${pathParts.slice(0, -1).join('/')}/${encoded}`;
      alternatives.push(newUrl);
    }
    
    // 3. Essayer sans accents (ASCII-safe)
    const withoutAccents = fixed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    
    if (withoutAccents !== fixed) {
      const encoded = encodeURIComponent(withoutAccents);
      const newUrl = `${url.origin}${pathParts.slice(0, -1).join('/')}/${encoded}`;
      alternatives.push(newUrl);
    }
    
  } catch (error) {
    console.error('Erreur lors de la correction:', error);
  }
  
  return alternatives;
}

/**
 * Vérifie si une URL est accessible
 */
async function checkUrlAccessibility(url: string): Promise<{ accessible: boolean; status: number }> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: () => true,
    });
    return {
      accessible: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error: any) {
    return {
      accessible: false,
      status: error.response?.status || 0,
    };
  }
}

/**
 * Liste les fichiers dans le bucket R2 pour trouver le vrai nom
 */
async function findFileInR2(bucketPath: string): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: bucketPath.split('/').slice(0, -1).join('/') + '/',
    });
    
    const response = await r2Client.send(command);
    const files = (response.Contents || []).map(obj => obj.Key || '').filter(Boolean);
    return files;
  } catch (error) {
    console.error('Erreur lors de la recherche dans R2:', error);
    return [];
  }
}

async function fixBrokenVideoUrls() {
  console.log('🔧 Correction des URLs vidéo avec encodage cassé...\n');

  try {
    // Récupérer toutes les vidéos
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        video_url: true,
        thumbnail_url: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`📊 Total de vidéos: ${videos.length}\n`);

    // Trouver les vidéos avec encodage cassé
    const brokenVideos = videos.filter(v => 
      /Ã©|Ã¨|Ã |â\u0080\u0099|Ã§|Ãª|Ã®|Ã´|Ã»/i.test(v.video_url)
    );

    if (brokenVideos.length === 0) {
      console.log('✅ Aucune vidéo avec encodage cassé trouvée.\n');
      return;
    }

    console.log(`🚨 ${brokenVideos.length} vidéo(s) avec encodage cassé trouvée(s)\n`);

    for (const video of brokenVideos) {
      console.log(`\n📹 Vidéo: ${video.title} (ID: ${video.id})`);
      console.log(`   URL actuelle: ${video.video_url}`);

      // Vérifier si l'URL actuelle est accessible
      const currentCheck = await checkUrlAccessibility(video.video_url);
      if (currentCheck.accessible) {
        console.log(`   ✅ URL actuelle accessible (HTTP ${currentCheck.status})`);
        console.log(`   → Pas besoin de correction\n`);
        continue;
      }

      console.log(`   ❌ URL actuelle inaccessible (HTTP ${currentCheck.status})`);

      // Essayer de corriger l'URL
      const alternatives = tryFixFilename(video.video_url);
      console.log(`   🔍 ${alternatives.length} alternative(s) générée(s)`);

      let fixed = false;
      for (const altUrl of alternatives) {
        const check = await checkUrlAccessibility(altUrl);
        if (check.accessible) {
          console.log(`   ✅ URL corrigée trouvée: ${altUrl}`);
          
          // Mettre à jour dans la DB
          await prisma.video.update({
            where: { id: video.id },
            data: { video_url: altUrl },
          });
          
          console.log(`   ✅ URL mise à jour dans la base de données\n`);
          fixed = true;
          break;
        }
      }

      if (!fixed) {
        console.log(`   ❌ Aucune URL alternative accessible trouvée`);
        console.log(`   💡 Solution: Supprimer cette vidéo et la réuploader\n`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Correction terminée\n');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
fixBrokenVideoUrls()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

