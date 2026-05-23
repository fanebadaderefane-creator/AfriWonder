/**
 * Script pour détecter les URLs de domaines non autorisés dans la base de données
 * Vérifie toutes les entités qui peuvent contenir des URLs
 *
 * Usage: npx tsx backend/scripts/detect-blocked-urls.ts
 */

import prisma from '../src/config/database.js';

function isBlockedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('base44') || url.includes('base44.com');
}

async function detectBlockedUrls() {
  console.log('🔍 Recherche des URLs de domaines non autorisés...\n');

  let totalIssues = 0;

  try {
    // 1. Vérifier les vidéos
    console.log('📹 Vérification des vidéos...');
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
    });

    const blockedVideos = videos.filter((v) =>
      isBlockedUrl(v.video_url) || isBlockedUrl(v.thumbnail_url)
    );

    if (blockedVideos.length > 0) {
      console.log(`   ❌ ${blockedVideos.length} vidéo(s) avec URLs non autorisées`);
      blockedVideos.forEach((v) => {
        console.log(`      - ${v.id}: ${v.title}`);
        if (isBlockedUrl(v.video_url)) console.log(`        URL vidéo: ${v.video_url}`);
        if (isBlockedUrl(v.thumbnail_url)) console.log(`        URL thumbnail: ${v.thumbnail_url}`);
      });
      totalIssues += blockedVideos.length;
    } else {
      console.log('   ✅ Aucune vidéo avec URL domaine non autorisé');
    }

    // 2. Vérifier les utilisateurs (profile_image)
    console.log('\n👤 Vérification des utilisateurs...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        profile_image: true,
      },
    });

    const blockedUsers = users.filter((u) => isBlockedUrl(u.profile_image));

    if (blockedUsers.length > 0) {
      console.log(`   ❌ ${blockedUsers.length} utilisateur(s) avec URL domaine non autorisé`);
      blockedUsers.forEach((u) => {
        console.log(`      - ${u.username} (${u.id}): ${u.profile_image}`);
      });
      totalIssues += blockedUsers.length;
    } else {
      console.log('   ✅ Aucun utilisateur avec URL domaine non autorisé');
    }

    // 3. Vérifier les produits (images)
    console.log('\n🛍️ Vérification des produits...');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        images: true,
      },
    });

    const blockedProducts = products.filter((p) =>
      p.images.some((img) => isBlockedUrl(img))
    );

    if (blockedProducts.length > 0) {
      console.log(`   ❌ ${blockedProducts.length} produit(s) avec URLs non autorisées`);
      blockedProducts.forEach((p) => {
        const blockedImages = p.images.filter((img) => isBlockedUrl(img));
        console.log(`      - ${p.name} (${p.id}): ${blockedImages.length} image(s) non autorisée(s)`);
      });
      totalIssues += blockedProducts.length;
    } else {
      console.log('   ✅ Aucun produit avec URL domaine non autorisé');
    }

    // 4. Vérifier les cours (thumbnail_url)
    console.log('\n📚 Vérification des cours...');
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        thumbnail_url: true,
      },
    });

    const blockedCourses = courses.filter((c) => isBlockedUrl(c.thumbnail_url));

    if (blockedCourses.length > 0) {
      console.log(`   ❌ ${blockedCourses.length} cours avec URL domaine non autorisé`);
      blockedCourses.forEach((c) => {
        console.log(`      - ${c.title} (${c.id}): ${c.thumbnail_url}`);
      });
      totalIssues += blockedCourses.length;
    } else {
      console.log('   ✅ Aucun cours avec URL domaine non autorisé');
    }

    // 5. Vérifier les communautés (avatar, banner)
    console.log('\n👥 Vérification des communautés...');
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        banner: true,
      },
    });

    const blockedCommunities = communities.filter((c) =>
      isBlockedUrl(c.avatar) || isBlockedUrl(c.banner)
    );

    if (blockedCommunities.length > 0) {
      console.log(`   ❌ ${blockedCommunities.length} communauté(s) avec URL domaine non autorisé`);
      blockedCommunities.forEach((c) => {
        console.log(`      - ${c.name} (${c.id})`);
        if (isBlockedUrl(c.avatar)) console.log(`        Avatar: ${c.avatar}`);
        if (isBlockedUrl(c.banner)) console.log(`        Banner: ${c.banner}`);
      });
      totalIssues += blockedCommunities.length;
    } else {
      console.log('   ✅ Aucune communauté avec URL domaine non autorisé');
    }

    // 6. Vérifier les stories (media_url)
    console.log('\n📸 Vérification des stories...');
    const stories = await prisma.story.findMany({
      select: {
        id: true,
        media_url: true,
        media_type: true,
      },
    });

    const blockedStories = stories.filter((s) => isBlockedUrl(s.media_url));

    if (blockedStories.length > 0) {
      console.log(`   ❌ ${blockedStories.length} story/stories avec URL domaine non autorisé`);
      totalIssues += blockedStories.length;
    } else {
      console.log('   ✅ Aucune story avec URL domaine non autorisé');
    }

    // 7. Vérifier les live streams (stream_url)
    console.log('\n🔴 Vérification des live streams...');
    const liveStreams = await prisma.liveStream.findMany({
      select: {
        id: true,
        title: true,
        stream_url: true,
      },
    });

    const blockedLiveStreams = liveStreams.filter((ls) => isBlockedUrl(ls.stream_url));

    if (blockedLiveStreams.length > 0) {
      console.log(`   ❌ ${blockedLiveStreams.length} live stream(s) avec URL domaine non autorisé`);
      totalIssues += blockedLiveStreams.length;
    } else {
      console.log('   ✅ Aucun live stream avec URL domaine non autorisé');
    }

    // 8. Vérifier les reviews (photos)
    console.log('\n⭐ Vérification des avis...');
    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        photos: true,
      },
    });

    const blockedReviews = reviews.filter((r) =>
      r.photos.some((photo) => isBlockedUrl(photo))
    );

    if (blockedReviews.length > 0) {
      console.log(`   ❌ ${blockedReviews.length} avis avec URLs non autorisées`);
      totalIssues += blockedReviews.length;
    } else {
      console.log('   ✅ Aucun avis avec URL domaine non autorisé');
    }

    // 9. Vérifier les seller profiles (store_logo, store_banner)
    console.log('\n🏪 Vérification des profils vendeurs...');
    const sellerProfiles = await prisma.sellerProfile.findMany({
      select: {
        id: true,
        store_name: true,
        store_logo: true,
        store_banner: true,
      },
    });

    const blockedSellerProfiles = sellerProfiles.filter((sp) =>
      isBlockedUrl(sp.store_logo) || isBlockedUrl(sp.store_banner)
    );

    if (blockedSellerProfiles.length > 0) {
      console.log(`   ❌ ${blockedSellerProfiles.length} profil(s) vendeur avec URL domaine non autorisé`);
      totalIssues += blockedSellerProfiles.length;
    } else {
      console.log('   ✅ Aucun profil vendeur avec URL domaine non autorisé');
    }

    // 10. Vérifier les certificats (certificate_url)
    console.log('\n🎓 Vérification des certificats...');
    const certificates = await prisma.certificate.findMany({
      select: {
        id: true,
        certificate_url: true,
      },
    });

    const blockedCertificates = certificates.filter((c) => isBlockedUrl(c.certificate_url));

    if (blockedCertificates.length > 0) {
      console.log(`   ❌ ${blockedCertificates.length} certificat(s) avec URL domaine non autorisé`);
      totalIssues += blockedCertificates.length;
    } else {
      console.log('   ✅ Aucun certificat avec URL domaine non autorisé');
    }

    // 11. Vérifier les articles de news (cover_image)
    console.log('\n📰 Vérification des articles de news...');
    const newsArticles = await prisma.newsArticle.findMany({
      select: {
        id: true,
        title: true,
        cover_image: true,
      },
    });

    const blockedNews = newsArticles.filter((n) => isBlockedUrl(n.cover_image));

    if (blockedNews.length > 0) {
      console.log(`   ❌ ${blockedNews.length} article(s) avec URL domaine non autorisé`);
      totalIssues += blockedNews.length;
    } else {
      console.log('   ✅ Aucun article avec URL domaine non autorisé');
    }

    // 12. Vérifier les candidatures (resume_url)
    console.log('\n💼 Vérification des candidatures...');
    const jobApplications = await prisma.jobApplication.findMany({
      select: {
        id: true,
        resume_url: true,
      },
    });

    const blockedApplications = jobApplications.filter((ja) => isBlockedUrl(ja.resume_url));

    if (blockedApplications.length > 0) {
      console.log(`   ❌ ${blockedApplications.length} candidature(s) avec URL domaine non autorisé`);
      totalIssues += blockedApplications.length;
    } else {
      console.log('   ✅ Aucune candidature avec URL domaine non autorisé');
    }

    // Résumé final
    console.log('\n═══════════════════════════════════════════════════════════');
    if (totalIssues === 0) {
      console.log('✅ AUCUNE URL NON AUTORISÉE TROUVÉE !');
      console.log('✅ Toutes les entités utilisent votre propre CDN (R2/Cloudflare).');
    } else {
      console.log(`🚨 PROBLÈME: ${totalIssues} entité(s) avec des URLs non autorisées détectées !`);
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Supprimer ces entités et les recréer avec votre CDN');
      console.log('   2. Ou renommer manuellement les fichiers sur R2 et mettre à jour les URLs dans la DB');
      console.log('   3. Les nouvelles entités sont protégées contre les URLs de domaines non autorisés');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur lors de la détection:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

detectBlockedUrls()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
