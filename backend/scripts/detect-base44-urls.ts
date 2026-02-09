/**
 * Script pour détecter les URLs Base44 dans TOUTE la base de données
 * Vérifie toutes les entités qui peuvent contenir des URLs
 * 
 * Usage: npx tsx backend/scripts/detect-base44-urls.ts
 */

import prisma from '../src/config/database.js';

function isBase44Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('base44') || url.includes('base44.com');
}

async function detectBase44Urls() {
  console.log('🔍 Recherche des URLs Base44 dans TOUTE la base de données...\n');

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

    const base44Videos = videos.filter((v) => 
      isBase44Url(v.video_url) || isBase44Url(v.thumbnail_url)
    );

    if (base44Videos.length > 0) {
      console.log(`   ❌ ${base44Videos.length} vidéo(s) avec URLs Base44`);
      base44Videos.forEach((v) => {
        console.log(`      - ${v.id}: ${v.title}`);
        if (isBase44Url(v.video_url)) console.log(`        URL vidéo: ${v.video_url}`);
        if (isBase44Url(v.thumbnail_url)) console.log(`        URL thumbnail: ${v.thumbnail_url}`);
      });
      totalIssues += base44Videos.length;
    } else {
      console.log('   ✅ Aucune vidéo avec URL Base44');
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

    const base44Users = users.filter((u) => isBase44Url(u.profile_image));

    if (base44Users.length > 0) {
      console.log(`   ❌ ${base44Users.length} utilisateur(s) avec URL Base44`);
      base44Users.forEach((u) => {
        console.log(`      - ${u.username} (${u.id}): ${u.profile_image}`);
      });
      totalIssues += base44Users.length;
    } else {
      console.log('   ✅ Aucun utilisateur avec URL Base44');
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

    const base44Products = products.filter((p) => 
      p.images.some((img) => isBase44Url(img))
    );

    if (base44Products.length > 0) {
      console.log(`   ❌ ${base44Products.length} produit(s) avec URLs Base44`);
      base44Products.forEach((p) => {
        const base44Images = p.images.filter((img) => isBase44Url(img));
        console.log(`      - ${p.name} (${p.id}): ${base44Images.length} image(s) Base44`);
      });
      totalIssues += base44Products.length;
    } else {
      console.log('   ✅ Aucun produit avec URL Base44');
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

    const base44Courses = courses.filter((c) => isBase44Url(c.thumbnail_url));

    if (base44Courses.length > 0) {
      console.log(`   ❌ ${base44Courses.length} cours avec URL Base44`);
      base44Courses.forEach((c) => {
        console.log(`      - ${c.title} (${c.id}): ${c.thumbnail_url}`);
      });
      totalIssues += base44Courses.length;
    } else {
      console.log('   ✅ Aucun cours avec URL Base44');
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

    const base44Communities = communities.filter((c) => 
      isBase44Url(c.avatar) || isBase44Url(c.banner)
    );

    if (base44Communities.length > 0) {
      console.log(`   ❌ ${base44Communities.length} communauté(s) avec URL Base44`);
      base44Communities.forEach((c) => {
        console.log(`      - ${c.name} (${c.id})`);
        if (isBase44Url(c.avatar)) console.log(`        Avatar: ${c.avatar}`);
        if (isBase44Url(c.banner)) console.log(`        Banner: ${c.banner}`);
      });
      totalIssues += base44Communities.length;
    } else {
      console.log('   ✅ Aucune communauté avec URL Base44');
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

    const base44Stories = stories.filter((s) => isBase44Url(s.media_url));

    if (base44Stories.length > 0) {
      console.log(`   ❌ ${base44Stories.length} story/stories avec URL Base44`);
      totalIssues += base44Stories.length;
    } else {
      console.log('   ✅ Aucune story avec URL Base44');
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

    const base44LiveStreams = liveStreams.filter((ls) => isBase44Url(ls.stream_url));

    if (base44LiveStreams.length > 0) {
      console.log(`   ❌ ${base44LiveStreams.length} live stream(s) avec URL Base44`);
      totalIssues += base44LiveStreams.length;
    } else {
      console.log('   ✅ Aucun live stream avec URL Base44');
    }

    // 8. Vérifier les reviews (photos)
    console.log('\n⭐ Vérification des avis...');
    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        photos: true,
      },
    });

    const base44Reviews = reviews.filter((r) => 
      r.photos.some((photo) => isBase44Url(photo))
    );

    if (base44Reviews.length > 0) {
      console.log(`   ❌ ${base44Reviews.length} avis avec URLs Base44`);
      totalIssues += base44Reviews.length;
    } else {
      console.log('   ✅ Aucun avis avec URL Base44');
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

    const base44SellerProfiles = sellerProfiles.filter((sp) => 
      isBase44Url(sp.store_logo) || isBase44Url(sp.store_banner)
    );

    if (base44SellerProfiles.length > 0) {
      console.log(`   ❌ ${base44SellerProfiles.length} profil(s) vendeur avec URL Base44`);
      totalIssues += base44SellerProfiles.length;
    } else {
      console.log('   ✅ Aucun profil vendeur avec URL Base44');
    }

    // 10. Vérifier les certificats (certificate_url)
    console.log('\n🎓 Vérification des certificats...');
    const certificates = await prisma.certificate.findMany({
      select: {
        id: true,
        certificate_url: true,
      },
    });

    const base44Certificates = certificates.filter((c) => isBase44Url(c.certificate_url));

    if (base44Certificates.length > 0) {
      console.log(`   ❌ ${base44Certificates.length} certificat(s) avec URL Base44`);
      totalIssues += base44Certificates.length;
    } else {
      console.log('   ✅ Aucun certificat avec URL Base44');
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

    const base44News = newsArticles.filter((n) => isBase44Url(n.cover_image));

    if (base44News.length > 0) {
      console.log(`   ❌ ${base44News.length} article(s) avec URL Base44`);
      totalIssues += base44News.length;
    } else {
      console.log('   ✅ Aucun article avec URL Base44');
    }

    // 12. Vérifier les candidatures (resume_url)
    console.log('\n💼 Vérification des candidatures...');
    const jobApplications = await prisma.jobApplication.findMany({
      select: {
        id: true,
        resume_url: true,
      },
    });

    const base44Applications = jobApplications.filter((ja) => isBase44Url(ja.resume_url));

    if (base44Applications.length > 0) {
      console.log(`   ❌ ${base44Applications.length} candidature(s) avec URL Base44`);
      totalIssues += base44Applications.length;
    } else {
      console.log('   ✅ Aucune candidature avec URL Base44');
    }

    // Résumé final
    console.log('\n═══════════════════════════════════════════════════════════');
    if (totalIssues === 0) {
      console.log('✅ AUCUNE URL BASE44 TROUVÉE !');
      console.log('✅ Toutes les entités utilisent votre propre CDN (R2/Cloudflare).');
    } else {
      console.log(`🚨 PROBLÈME: ${totalIssues} entité(s) avec des URLs Base44 détectée(s) !`);
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Supprimer ces entités et les recréer avec votre CDN');
      console.log('   2. Ou renommer manuellement les fichiers sur R2 et mettre à jour les URLs dans la DB');
      console.log('   3. Les nouvelles entités sont maintenant protégées contre les URLs Base44');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur lors de la détection:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
detectBase44Urls()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
