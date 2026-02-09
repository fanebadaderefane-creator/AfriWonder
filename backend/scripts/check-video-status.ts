/**
 * Script pour vérifier le statut d'une vidéo spécifique
 * 
 * Usage: npx tsx backend/scripts/check-video-status.ts
 */

import prisma from '../src/config/database.js';
import axios from 'axios';

async function checkVideoStatus() {
  console.log('🔍 Vérification du statut de la vidéo...\n');

  try {
    // Récupérer toutes les vidéos
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

    if (videos.length === 0) {
      console.log('❌ Aucune vidéo dans la base de données.\n');
      return;
    }

    console.log(`📊 ${videos.length} vidéo(s) trouvée(s)\n`);

    for (const video of videos) {
      console.log(`\n📹 Vidéo: ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Date de création: ${video.created_at}`);
      console.log(`   URL: ${video.video_url}`);

      // Vérifier si l'URL contient des caractères cassés
      const hasBrokenEncoding = /Ã©|Ã¨|Ã |â\u0080\u0099|Ã§|Ãª|Ã®|Ã´|Ã»/i.test(video.video_url);
      const isBlockedDomain = video.video_url.includes('base44') || video.video_url.includes('base44.com');
      const isR2Direct = video.video_url.includes('r2.cloudflarestorage.com');
      const isCustomDomain = video.video_url.includes('cdn.afriwonder.com');

      console.log(`\n   📋 Analyse:`);
      console.log(`      ${hasBrokenEncoding ? '❌' : '✅'} Encodage: ${hasBrokenEncoding ? 'CASSÉ' : 'Correct'}`);
      console.log(`      ${isBlockedDomain ? '❌' : '✅'} Domaine autorisé: ${isBlockedDomain ? 'NON' : 'OUI'}`);
      console.log(`      ${isR2Direct ? '✅' : '⚠️'} URL R2: ${isR2Direct ? 'Directe' : isCustomDomain ? 'Custom domain' : 'Autre'}`);

      // Tester l'accessibilité
      console.log(`\n   🔍 Test d'accessibilité...`);
      try {
        const response = await axios.head(video.video_url, {
          timeout: 10000,
          validateStatus: () => true,
        });

        if (response.status >= 200 && response.status < 400) {
          console.log(`      ✅ URL accessible (HTTP ${response.status})`);
          console.log(`      ✅ La vidéo devrait fonctionner !`);
        } else {
          console.log(`      ❌ URL inaccessible (HTTP ${response.status})`);
          console.log(`      ❌ La vidéo ne fonctionnera pas`);
        }
      } catch (error: any) {
        if (error.code === 'ENOTFOUND') {
          console.log(`      ❌ Domaine non résolu: ${error.hostname || 'inconnu'}`);
          console.log(`      💡 Le custom domain n'est pas configuré`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`      ❌ Connexion refusée`);
        } else {
          console.log(`      ❌ Erreur: ${error.message || 'Inconnue'}`);
        }
        console.log(`      ❌ La vidéo ne fonctionnera pas`);
      }

      // Vérifier le nom du fichier
      try {
        const url = new URL(video.video_url);
        const pathParts = url.pathname.split('/');
        const fileName = decodeURIComponent(pathParts[pathParts.length - 1]);
        console.log(`\n   📁 Nom du fichier: ${fileName}`);
        
        // Vérifier si le nom est ASCII-safe
        const isAsciiSafe = /^[a-zA-Z0-9._-]+$/.test(fileName.replace(/\d+-/, ''));
        console.log(`      ${isAsciiSafe ? '✅' : '⚠️'} Nom ASCII-safe: ${isAsciiSafe ? 'OUI' : 'NON'}`);
      } catch {
        console.log(`\n   ⚠️ Impossible d'analyser le nom du fichier`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkVideoStatus()
  .then(() => {
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

