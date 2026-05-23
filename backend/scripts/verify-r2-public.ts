/**
 * Script pour vérifier si le bucket R2 est configuré en public access
 * et tester l'accès aux fichiers
 * 
 * Usage: npx tsx backend/scripts/verify-r2-public.ts
 */

import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../src/config/cloudflare-r2.js';
import axios from 'axios';

async function verifyR2Public() {
  console.log('🔍 Vérification de la configuration R2 Public Access...\n');
  console.log(`📦 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`🌐 URL publique configurée: ${R2_PUBLIC_URL}\n`);

  try {
    // 1. Lister les fichiers vidéo
    console.log('📦 Liste des fichiers vidéo sur R2...\n');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/',
      MaxKeys: 3,
    });

    const listResponse = await r2Client.send(listCommand);
    const files = (listResponse.Contents || [])
      .map(obj => obj.Key || '')
      .filter(Boolean);

    if (files.length === 0) {
      console.log('⚠️ Aucun fichier vidéo trouvé sur R2.\n');
      console.log('💡 Upload une vidéo d\'abord pour tester.\n');
      return;
    }

    console.log(`✅ ${files.length} fichier(s) trouvé(s)\n`);

    // 2. Tester l'accès public pour chaque fichier
    let successCount = 0;
    let failCount = 0;

    for (const fileKey of files) {
      const fileName = fileKey.replace('videos/', '');
      console.log(`📹 Test: ${fileName}`);

      // Construire l'URL publique
      const encodedFileName = encodeURIComponent(fileName);
      const publicUrl = `${R2_PUBLIC_URL}/videos/${encodedFileName}`;
      
      console.log(`   URL: ${publicUrl}`);

      try {
        // Tester avec HEAD (plus rapide)
        const response = await axios.head(publicUrl, {
          timeout: 10000,
          validateStatus: () => true,
          maxRedirects: 0,
        });

        if (response.status === 200) {
          console.log(`   ✅ Accessible (HTTP ${response.status})`);
          console.log(`   📊 Content-Type: ${response.headers['content-type'] || 'N/A'}`);
          console.log(`   📏 Content-Length: ${response.headers['content-length'] || 'N/A'} bytes`);
          successCount++;
        } else if (response.status === 403) {
          console.log(`   ❌ Accès refusé (HTTP ${response.status})`);
          console.log(`   💡 Le bucket n'est PAS configuré en public access`);
          failCount++;
        } else if (response.status === 404) {
          console.log(`   ❌ Fichier non trouvé (HTTP ${response.status})`);
          console.log(`   💡 Vérifiez que l'URL est correcte`);
          failCount++;
        } else if (response.status === 400) {
          console.log(`   ❌ Requête invalide (HTTP ${response.status})`);
          console.log(`   💡 Le bucket n'est probablement pas public ou l'URL est incorrecte`);
          failCount++;
        } else {
          console.log(`   ⚠️ Statut inattendu (HTTP ${response.status})`);
          failCount++;
        }
      } catch (error: any) {
        if (error.code === 'ENOTFOUND') {
          console.log(`   ❌ Domaine non résolu: ${error.hostname}`);
          console.log(`   💡 Le custom domain n'est pas configuré ou le DNS n'est pas propagé`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`   ❌ Connexion refusée`);
          console.log(`   💡 Vérifiez que le bucket est public et que l'URL est correcte`);
        } else {
          console.log(`   ❌ Erreur: ${error.message || 'Inconnue'}`);
        }
        failCount++;
      }

      console.log('');
    }

    // 3. Résumé
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 RÉSUMÉ:\n');
    console.log(`   ✅ Fichiers accessibles: ${successCount}/${files.length}`);
    console.log(`   ❌ Fichiers inaccessibles: ${failCount}/${files.length}\n`);

    if (successCount === files.length) {
      console.log('🎉 SUCCÈS ! Le bucket R2 est correctement configuré en public access.\n');
      console.log('✅ Vos vidéos devraient fonctionner dans l\'application.\n');
    } else if (failCount === files.length) {
      console.log('❌ ÉCHEC ! Le bucket R2 n\'est PAS configuré en public access.\n');
      console.log('📋 ACTIONS REQUISES:\n');
      console.log('   1. Allez dans Cloudflare Dashboard > R2 > votre bucket');
      console.log('   2. Settings > Public Access');
      console.log('   3. Activez "Allow Access" ou configurez un Custom Domain');
      console.log('   4. Relancez ce script pour vérifier\n');
      console.log('📖 Guide détaillé: backend/docs/R2_PUBLIC_ACCESS_SETUP.md\n');
    } else {
      console.log('⚠️ RÉSULTAT MIXTE ! Certains fichiers sont accessibles, d\'autres non.\n');
      console.log('💡 Vérifiez la configuration R2 et les permissions.\n');
    }

    // 4. Informations supplémentaires
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('ℹ️ INFORMATIONS:\n');
    console.log(`   Bucket: ${R2_BUCKET_NAME}`);
    console.log(`   URL publique: ${R2_PUBLIC_URL}`);
    
    if (R2_PUBLIC_URL.includes('r2.cloudflarestorage.com')) {
      console.log(`   Type: URL R2 directe`);
      console.log(`   ✅ Fonctionne si le bucket est public`);
    } else if (R2_PUBLIC_URL.includes('cdn.afriwonder.com')) {
      console.log(`   Type: Custom Domain`);
      console.log(`   ✅ Nécessite DNS configuré + bucket public`);
    } else {
      console.log(`   Type: Autre`);
      console.log(`   ⚠️ Vérifiez que cette URL est correcte`);
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification:', error);
    
    if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Problème de credentials R2.');
      console.log('   Vérifiez vos R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY dans .env\n');
    } else if (error.name === 'NoSuchBucket') {
      console.log('\n💡 Le bucket n\'existe pas.');
      console.log(`   Vérifiez que le bucket "${R2_BUCKET_NAME}" existe dans votre compte R2\n`);
    }
    
    throw error;
  }
}

// Exécuter le script
verifyR2Public()
  .then(() => {
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

