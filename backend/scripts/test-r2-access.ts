/**
 * Script pour tester l'accès public au bucket R2
 * 
 * Usage: npx tsx backend/scripts/test-r2-access.ts
 */

import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '../src/config/cloudflare-r2.js';
import axios from 'axios';

async function testR2Access() {
  console.log('🔍 Test d\'accès au bucket R2...\n');

  try {
    // 1. Lister les fichiers
    console.log('📦 Liste des fichiers vidéo sur R2...\n');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/',
      MaxKeys: 5,
    });

    const listResponse = await r2Client.send(listCommand);
    const files = (listResponse.Contents || [])
      .map(obj => obj.Key || '')
      .filter(Boolean);

    if (files.length === 0) {
      console.log('❌ Aucun fichier vidéo trouvé sur R2.\n');
      return;
    }

    console.log(`✅ ${files.length} fichier(s) trouvé(s)\n`);

    // 2. Tester l'accès public pour chaque fichier
    for (const fileKey of files.slice(0, 3)) {
      const fileName = fileKey.replace('videos/', '');
      console.log(`📹 Fichier: ${fileName}`);

      // URL R2 directe
      const r2DirectUrl = `https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/afriwonder/${fileKey}`;
      const encodedUrl = `https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/afriwonder/videos/${encodeURIComponent(fileName)}`;

      console.log(`   URL directe: ${r2DirectUrl}`);
      
      try {
        const response = await axios.head(r2DirectUrl, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status >= 200 && response.status < 400) {
          console.log(`   ✅ Accessible (HTTP ${response.status})`);
        } else {
          console.log(`   ❌ Non accessible (HTTP ${response.status})`);
        }
      } catch (error: any) {
        console.log(`   ❌ Erreur: ${error.message || 'Inconnue'}`);
      }

      // Tester avec l'URL encodée
      console.log(`   URL encodée: ${encodedUrl}`);
      try {
        const response2 = await axios.head(encodedUrl, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response2.status >= 200 && response2.status < 400) {
          console.log(`   ✅ Accessible (HTTP ${response2.status})`);
        } else {
          console.log(`   ❌ Non accessible (HTTP ${response2.status})`);
        }
      } catch (error: any) {
        console.log(`   ❌ Erreur: ${error.message || 'Inconnue'}`);
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 DIAGNOSTIC:\n');
    console.log('Si toutes les URLs retournent 403 ou 400:');
    console.log('   → Le bucket R2 n\'est pas configuré en public access');
    console.log('   → Solution: Configurer le bucket en public dans Cloudflare R2 Dashboard\n');
    console.log('Si les URLs retournent 404:');
    console.log('   → Le format de l\'URL est incorrect');
    console.log('   → Solution: Vérifier le format de l\'URL R2\n');
    console.log('Si les URLs fonctionnent:');
    console.log('   → Le bucket est public, le problème vient d\'ailleurs\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

testR2Access()
  .then(() => {
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

