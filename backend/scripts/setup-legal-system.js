import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Create a .env file or set the variable.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Script de configuration initiale du système légal et sécurité
 * 
 * Exécution: node scripts/setup-legal-system.js
 */

async function setupLegalDocuments() {
  console.log('📄 Création des documents légaux...');

  // Politique de confidentialité
  const privacyPolicy = await prisma.legalDocument.upsert({
    where: {
      type_version_language: {
        type: 'privacy_policy',
        version: '1.0',
        language: 'fr',
      },
    },
    update: {},
    create: {
      type: 'privacy_policy',
      version: '1.0',
      language: 'fr',
      title: 'Politique de confidentialité - AfriWonder',
      content: `
<div class="legal-content">
  <h2>1. Collecte des données</h2>
  <p>AfriWonder collecte les informations suivantes :</p>
  <ul>
    <li>Nom et prénom</li>
    <li>Adresse email</li>
    <li>Photo de profil (si fournie via OAuth Facebook/Google)</li>
    <li>Informations de profil (bio, localisation si vous les fournissez)</li>
  </ul>

  <h2>2. Utilisation des données</h2>
  <p>Vos données sont utilisées pour :</p>
  <ul>
    <li>Créer et gérer votre compte utilisateur</li>
    <li>Permettre la connexion à l'application</li>
    <li>Fournir nos services (vidéos, marketplace, événements, etc.)</li>
    <li>Personnaliser votre expérience</li>
    <li>Vous envoyer des notifications relatives à votre activité</li>
    <li>Améliorer nos services</li>
  </ul>

  <h2>3. Partage des données</h2>
  <p><strong>AfriWonder ne vend ni ne partage vos données personnelles avec des tiers à des fins commerciales.</strong></p>
  <p>Nous pouvons partager vos données uniquement dans les cas suivants :</p>
  <ul>
    <li>Avec votre consentement explicite</li>
    <li>Pour se conformer à une obligation légale</li>
    <li>Avec des prestataires de services (hébergement, paiement) sous contrat de confidentialité</li>
  </ul>

  <h2>4. Vos droits RGPD</h2>
  <p>Conformément au RGPD, vous disposez des droits suivants :</p>
  <ul>
    <li><strong>Droit d'accès :</strong> Consultez toutes vos données via Paramètres → Confidentialité</li>
    <li><strong>Droit de rectification :</strong> Modifiez vos informations dans votre profil</li>
    <li><strong>Droit à l'oubli :</strong> Supprimez votre compte (avec période de grâce de 30 jours)</li>
    <li><strong>Droit à la portabilité :</strong> Exportez vos données au format JSON</li>
    <li><strong>Droit d'opposition :</strong> Refusez le traitement de vos données à des fins marketing</li>
  </ul>

  <h2>5. Cookies</h2>
  <p>Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez gérer vos préférences de cookies à tout moment.</p>
  <p>Types de cookies :</p>
  <ul>
    <li><strong>Essentiels :</strong> Nécessaires au fonctionnement du site</li>
    <li><strong>Analytiques :</strong> Nous aident à comprendre comment vous utilisez le site</li>
    <li><strong>Marketing :</strong> Personnalisent la publicité selon vos intérêts</li>
  </ul>

  <h2>6. Sécurité</h2>
  <p>Vos données sont protégées par :</p>
  <ul>
    <li>Chiffrement HTTPS/TLS 1.2+</li>
    <li>Hash sécurisé des mots de passe (bcrypt)</li>
    <li>Authentification à deux facteurs (2FA) disponible</li>
    <li>Détection automatique d'activités suspectes</li>
    <li>Accès aux données limité et contrôlé</li>
  </ul>

  <h2>7. Conservation des données</h2>
  <p>Nous conservons vos données aussi longtemps que votre compte est actif. Après suppression :</p>
  <ul>
    <li>Données personnelles supprimées sous 30 jours</li>
    <li>Données légales obligatoires (transactions) anonymisées et conservées selon la loi</li>
  </ul>

  <h2>8. Modifications</h2>
  <p>Nous pouvons mettre à jour cette politique. En cas de changement important, vous serez notifié et devrez accepter la nouvelle version.</p>

  <h2>9. Contact</h2>
  <p>Pour toute question sur vos données personnelles :</p>
  <ul>
    <li><strong>Email :</strong> dpo@afriwonder.app</li>
    <li><strong>DPO :</strong> Délégué à la Protection des Données</li>
  </ul>
</div>
      `,
      effective_date: new Date(),
      is_active: true,
    },
  });

  console.log('  ✅ Politique de confidentialité créée:', privacyPolicy.id);

  // Conditions d'utilisation
  const terms = await prisma.legalDocument.upsert({
    where: {
      type_version_language: {
        type: 'terms_of_service',
        version: '1.0',
        language: 'fr',
      },
    },
    update: {},
    create: {
      type: 'terms_of_service',
      version: '1.0',
      language: 'fr',
      title: 'Conditions d\'utilisation - AfriWonder',
      content: `
<div class="legal-content">
  <h2>1. Acceptation des conditions</h2>
  <p>En créant un compte ou en utilisant AfriWonder, vous acceptez ces conditions d'utilisation.</p>

  <h2>2. Description du service</h2>
  <p>AfriWonder est une plateforme sociale africaine proposant :</p>
  <ul>
    <li>Partage de vidéos courtes</li>
    <li>Marketplace de produits</li>
    <li>Services locaux</li>
    <li>Événements</li>
    <li>Cours en ligne</li>
    <li>Live streaming</li>
    <li>Et plus...</li>
  </ul>

  <h2>3. Compte utilisateur</h2>
  <p>Vous êtes responsable de :</p>
  <ul>
    <li>La confidentialité de votre mot de passe</li>
    <li>Toutes les activités sur votre compte</li>
    <li>L'exactitude des informations fournies</li>
  </ul>

  <h2>4. Contenu utilisateur</h2>
  <p><strong>Vous conservez la propriété de votre contenu.</strong></p>
  <p>En publiant du contenu, vous nous accordez une licence non-exclusive pour :</p>
  <ul>
    <li>Afficher votre contenu sur la plateforme</li>
    <li>Le partager avec d'autres utilisateurs</li>
    <li>L'optimiser pour différents appareils</li>
  </ul>

  <p>Vous vous engagez à ne pas publier de contenu :</p>
  <ul>
    <li>Illégal ou incitant à la haine</li>
    <li>Violant les droits d'auteur</li>
    <li>Pornographique ou inapproprié</li>
    <li>Spam ou fraude</li>
  </ul>

  <h2>5. Transactions et paiements</h2>
  <p>Pour les achats sur la marketplace :</p>
  <ul>
    <li>Les prix sont indiqués TTC</li>
    <li>Les paiements sont sécurisés</li>
    <li>Politique de remboursement selon les vendeurs</li>
    <li>AfriWonder prend une commission sur les ventes</li>
  </ul>

  <h2>6. Propriété intellectuelle</h2>
  <p>Le nom AfriWonder, le logo, et l'interface sont notre propriété exclusive.</p>

  <h2>7. Limitation de responsabilité</h2>
  <p>AfriWonder ne peut être tenu responsable de :</p>
  <ul>
    <li>Contenu publié par les utilisateurs</li>
    <li>Transactions entre utilisateurs</li>
    <li>Interruptions de service</li>
    <li>Pertes de données</li>
  </ul>

  <h2>8. Suspension et résiliation</h2>
  <p>Nous nous réservons le droit de suspendre ou supprimer votre compte en cas de :</p>
  <ul>
    <li>Violation de ces conditions</li>
    <li>Activités frauduleuses</li>
    <li>Comportement abusif</li>
  </ul>

  <h2>9. Modifications</h2>
  <p>Nous pouvons modifier ces conditions à tout moment. Les changements importants vous seront notifiés.</p>

  <h2>10. Loi applicable</h2>
  <p>Ces conditions sont régies par le droit sénégalais.</p>

  <h2>11. Contact</h2>
  <p>Pour toute question : <strong>legal@afriwonder.app</strong></p>
</div>
      `,
      effective_date: new Date(),
      is_active: true,
    },
  });

  console.log('  ✅ Conditions d\'utilisation créées:', terms.id);

  // Politique cookies
  const cookies = await prisma.legalDocument.upsert({
    where: {
      type_version_language: {
        type: 'cookies_policy',
        version: '1.0',
        language: 'fr',
      },
    },
    update: {},
    create: {
      type: 'cookies_policy',
      version: '1.0',
      language: 'fr',
      title: 'Politique de Cookies - AfriWonder',
      content: `
<div class="legal-content">
  <h2>Qu'est-ce qu'un cookie ?</h2>
  <p>Un cookie est un petit fichier texte stocké sur votre appareil lors de votre visite sur notre site.</p>

  <h2>Types de cookies utilisés</h2>
  
  <h3>1. Cookies essentiels</h3>
  <p>Nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.</p>
  <ul>
    <li>Authentification (maintien de session)</li>
    <li>Sécurité (protection CSRF)</li>
    <li>Préférences de langue</li>
  </ul>

  <h3>2. Cookies analytiques</h3>
  <p>Nous aident à comprendre comment vous utilisez le site.</p>
  <ul>
    <li>Google Analytics (avec anonymisation IP)</li>
    <li>Mesure de performance</li>
  </ul>

  <h3>3. Cookies marketing</h3>
  <p>Permettent de personnaliser les publicités.</p>
  <ul>
    <li>Facebook Pixel</li>
    <li>Google Ads</li>
  </ul>

  <h3>4. Cookies fonctionnels</h3>
  <p>Améliorent votre expérience.</p>
  <ul>
    <li>Préférences d'affichage</li>
    <li>Vidéos déjà vues</li>
  </ul>

  <h2>Gérer vos cookies</h2>
  <p>Vous pouvez à tout moment :</p>
  <ul>
    <li>Accepter tous les cookies</li>
    <li>Refuser les cookies non essentiels</li>
    <li>Personnaliser vos préférences</li>
  </ul>
  <p>Accédez à vos paramètres de cookies via le lien en bas de page.</p>

  <h2>Durée de conservation</h2>
  <ul>
    <li><strong>Cookies de session :</strong> Supprimés à la fermeture du navigateur</li>
    <li><strong>Cookies persistants :</strong> Maximum 13 mois</li>
  </ul>
</div>
      `,
      effective_date: new Date(),
      is_active: true,
    },
  });

  console.log('  ✅ Politique cookies créée:', cookies.id);
}

async function setupLegalEntity() {
  console.log('\n🏢 Configuration des informations légales...');

  const existing = await prisma.legalEntityInfo.findFirst();
  
  if (existing) {
    console.log('  ⚠️  Informations légales déjà existantes, passage...');
    return;
  }

  const info = await prisma.legalEntityInfo.create({
    data: {
      company_name: 'AfriWonder',
      legal_form: 'SAS',
      address: '123 Avenue de l\'Innovation',
      city: 'Dakar',
      postal_code: '10000',
      country: 'Sénégal',
      email: 'legal@afriwonder.app',
      dpo_name: 'Délégué à la Protection des Données',
      dpo_email: 'dpo@afriwonder.app',
      dpo_phone: '+221 XX XXX XX XX',
      data_controller: 'AfriWonder SAS',
      hosting_provider: 'AWS / Cloudflare',
      hosting_region: 'Europe (eu-west-1)',
    },
  });

  console.log('  ✅ Informations légales configurées');
}

async function setupRetentionPolicies() {
  console.log('\n⏱️  Configuration des politiques de rétention...');

  const policies = [
    { data_type: 'security_logs', retention_days: 365, description: 'Logs de sécurité (1 an)' },
    { data_type: 'notifications', retention_days: 90, description: 'Notifications lues (3 mois)' },
    { data_type: 'notification_logs', retention_days: 60, description: 'Logs de notifications (2 mois)' },
    { data_type: 'messages', retention_days: 730, description: 'Messages (2 ans)' },
    { data_type: 'guest_cookie_consents', retention_days: 395, description: 'Consentements invités (13 mois)' },
    { data_type: 'data_export_requests', retention_days: 90, description: 'Demandes d\'export expirées (3 mois)' },
    { data_type: 'suspicious_activity_alerts', retention_days: 180, description: 'Alertes résolues (6 mois)' },
    { data_type: 'admin_audit_logs', retention_days: 1825, description: 'Logs d\'audit admin (5 ans - légal)' },
    { data_type: 'consent_logs', retention_days: 1095, description: 'Logs de consentement (3 ans - preuve)' },
  ];

  for (const policy of policies) {
    await prisma.dataRetentionPolicy.upsert({
      where: { data_type: policy.data_type },
      update: {},
      create: {
        ...policy,
        auto_delete_enabled: true,
      },
    });
    console.log(`  ✅ ${policy.description}`);
  }
}

async function main() {
  console.log('🚀 Configuration du système légal et sécurité...\n');

  try {
    await setupLegalDocuments();
    await setupLegalEntity();
    await setupRetentionPolicies();

    console.log('\n✅ Configuration terminée avec succès!\n');
    console.log('📚 Prochaines étapes:');
    console.log('  1. Personnalisez le contenu des documents légaux selon vos besoins');
    console.log('  2. Mettez à jour les informations de votre entreprise');
    console.log('  3. Configurez l\'envoi d\'emails (SMTP) dans .env');
    console.log('  4. Testez le système avec un compte utilisateur\n');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
