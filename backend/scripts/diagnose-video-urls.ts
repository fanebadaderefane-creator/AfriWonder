/**
 * Script pour diagnostiquer les problèmes d'URLs vidéo
 * Vérifie les URLs dans la DB et teste leur accessibilité
 * 
 * Usage: npx tsx backend/scripts/diagnose-video-urls.ts
 */

import prisma from '../src/config/database.js';
import axios from 'axios';

async function diagnoseVideoUrls() {
  console.log('🔍 Diagnostic des URLs vidéo...\n');

  try {
    // Récupérer toutes les vidéos
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        video_url: true,
        thumbnail_url: true,
        created_at: true,
        creator: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`📊 Total de vidéos dans la base: ${videos.length}\n`);

    if (videos.length === 0) {
      console.log('✅ Aucune vidéo dans la base de données.\n');
      return;
    }

    // Analyser les URLs
    const issues: Array<{
      videoId: string;
      title: string;
      issue: string;
      url: string;
      suggestion?: string;
    }> = [];

    console.log('🔍 Analyse des URLs...\n');

    for (const video of videos) {
      // Vérifier si l'URL contient des caractères cassés
      const hasBrokenEncoding = /Ã©|Ã¨|Ã |â\u0080\u0099|Ã§|Ãª|Ã®|Ã´|Ã»/i.test(video.video_url);
      
      // Vérifier si l'URL est un domaine bloqué (externe non autorisé)
      const isBlockedDomain = video.video_url.includes('base44') || video.video_url.includes('base44.com');

      // Vérifier l'accessibilité de l'URL
      let isAccessible = false;
      let httpStatus = 0;
      let errorMessage = '';

      try {
        const response = await axios.head(video.video_url, {
          timeout: 5000,
          validateStatus: () => true, // Ne pas throw sur les erreurs HTTP
        });
        httpStatus = response.status;
        isAccessible = response.status >= 200 && response.status < 400;
      } catch (error: any) {
        errorMessage = error.message || 'Erreur inconnue';
        httpStatus = error.response?.status || 0;
      }

      // Détecter les problèmes
      if (isBlockedDomain) {
        issues.push({
          videoId: video.id,
          title: video.title,
          issue: 'URL domaine externe non autorisé',
          url: video.video_url,
          suggestion: 'Supprimer et réuploader avec votre CDN',
        });
      } else if (hasBrokenEncoding) {
        issues.push({
          videoId: video.id,
          title: video.title,
          issue: 'Nom de fichier avec encodage cassé (Ã©, â\u0080\u0099, etc.)',
          url: video.video_url,
          suggestion: 'Le fichier sur R2 a probablement un nom différent. Vérifier manuellement sur R2.',
        });
      } else if (!isAccessible) {
        issues.push({
          videoId: video.id,
          title: video.title,
          issue: `URL inaccessible (HTTP ${httpStatus})`,
          url: video.video_url,
          suggestion: httpStatus === 404 
            ? 'Fichier introuvable sur le CDN. Vérifier si le fichier existe sur R2.'
            : `Erreur: ${errorMessage || 'Inconnue'}`,
        });
      }
    }

    // Afficher les résultats
    console.log('═══════════════════════════════════════════════════════════\n');

    if (issues.length === 0) {
      console.log('✅ TOUTES LES VIDÉOS SONT ACCESSIBLES !\n');
      console.log('✅ Aucun problème détecté avec les URLs.\n');
    } else {
      console.log(`🚨 PROBLÈME: ${issues.length} vidéo(s) avec des problèmes détectée(s) !\n`);

      // Grouper par type de problème
      const blockedUrlIssues = issues.filter(i => i.issue.includes('domaine externe non autorisé'));
      const encodingIssues = issues.filter(i => i.issue.includes('encodage cassé'));
      const accessibilityIssues = issues.filter(i => i.issue.includes('inaccessible'));

      if (blockedUrlIssues.length > 0) {
        console.log(`\n❌ ${blockedUrlIssues.length} vidéo(s) avec URL domaine non autorisé:`);
        blockedUrlIssues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.title} (ID: ${issue.videoId})`);
          console.log(`   URL: ${issue.url}`);
          console.log(`   Solution: ${issue.suggestion}`);
        });
      }

      if (encodingIssues.length > 0) {
        console.log(`\n❌ ${encodingIssues.length} vidéo(s) avec encodage cassé:`);
        encodingIssues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.title} (ID: ${issue.videoId})`);
          console.log(`   URL: ${issue.url}`);
          console.log(`   Problème: ${issue.issue}`);
          console.log(`   Solution: ${issue.suggestion}`);
        });
      }

      if (accessibilityIssues.length > 0) {
        console.log(`\n❌ ${accessibilityIssues.length} vidéo(s) inaccessible(s):`);
        accessibilityIssues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.title} (ID: ${issue.videoId})`);
          console.log(`   URL: ${issue.url}`);
          console.log(`   Problème: ${issue.issue}`);
          console.log(`   Solution: ${issue.suggestion}`);
        });
      }

      console.log('\n═══════════════════════════════════════════════════════════\n');
      console.log('💡 SOLUTIONS RECOMMANDÉES:\n');
      console.log('1. Pour les vidéos avec encodage cassé:');
      console.log('   - Vérifier le nom réel du fichier sur R2');
      console.log('   - Mettre à jour l\'URL dans la DB pour correspondre au nom réel');
      console.log('   - OU supprimer et réuploader la vidéo\n');
      console.log('2. Pour les vidéos avec URL domaine non autorisé:');
      console.log('   - Supprimer ces vidéos de la DB');
      console.log('   - Réuploader avec votre CDN (R2)\n');
      console.log('3. Pour les vidéos inaccessibles (404):');
      console.log('   - Vérifier si le fichier existe sur R2');
      console.log('   - Si oui, vérifier les permissions/public URL');
      console.log('   - Si non, supprimer de la DB ou réuploader\n');
    }

    // Statistiques
    const workingVideos = videos.length - issues.length;
    console.log('\n📊 STATISTIQUES:');
    console.log(`   ✅ Vidéos fonctionnelles: ${workingVideos}/${videos.length}`);
    console.log(`   ❌ Vidéos avec problèmes: ${issues.length}/${videos.length}`);
    console.log(`   📈 Taux de succès: ${((workingVideos / videos.length) * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
diagnoseVideoUrls()
  .then(() => {
    console.log('✅ Diagnostic terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

