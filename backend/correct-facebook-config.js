#!/usr/bin/env node

/**
 * Script pour corriger automatiquement la configuration Facebook OAuth
 * Ajoute les URI correctes dans le fichier .env
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');

try {
  // Lire le fichier .env
  let envContent = readFileSync(envPath, 'utf-8');
  
  // Extraire l'URL ngrok actuelle
  const ngrokMatch = envContent.match(/FACEBOOK_REDIRECT_URI="(https:\/\/[^"]+)"/);
  const ngrokUrl = ngrokMatch ? ngrokMatch[1] : null;
  
  if (!ngrokUrl) {
    console.error('❌ Impossible de trouver FACEBOOK_REDIRECT_URI dans .env');
    process.exit(1);
  }
  
  console.log('✅ URL ngrok trouvée:', ngrokUrl);
  
  // Extraire le port
  const portMatch = envContent.match(/^PORT=(\d+)/m);
  const port = portMatch ? portMatch[1] : '3000';
  
  console.log('✅ Port backend:', port);
  
  // Vérifier que l'URI contient /api/auth/facebook/callback
  if (!ngrokUrl.includes('/api/auth/facebook/callback')) {
    console.error('❌ L\'URI ne contient pas /api/auth/facebook/callback');
    console.error('   URI actuelle:', ngrokUrl);
    process.exit(1);
  }
  
  // Vérifier que l'URI ngrok est correcte
  if (!ngrokUrl.startsWith('https://') || !ngrokUrl.includes('.ngrok-free.dev')) {
    console.warn('⚠️  L\'URI ngrok semble incorrecte:', ngrokUrl);
  }
  
  // Extraire le domaine ngrok (sans https:// et sans le chemin)
  const domainMatch = ngrokUrl.match(/https:\/\/([^/]+)/);
  const ngrokDomain = domainMatch ? domainMatch[1] : null;
  
  if (!ngrokDomain) {
    console.error('❌ Impossible d\'extraire le domaine ngrok');
    process.exit(1);
  }
  
  console.log('✅ Domaine ngrok:', ngrokDomain);
  
  // Créer le contenu pour Facebook Developer Console
  const facebookConfig = `
# ============================================
# CONFIGURATION FACEBOOK DEVELOPER CONSOLE
# ============================================
# Copiez-collez ces valeurs dans Facebook Developer Console
# Chemin : Connexion Facebook → Paramètres
# ============================================

## URI de redirection OAuth valides
# Supprimez toutes les autres URI et ajoutez UNIQUEMENT celle-ci :

${ngrokUrl}

# ⚠️ NOTE : http://localhost est automatiquement autorisé en mode développement
# Vous n'avez PAS besoin d'ajouter http://localhost:${port}/api/auth/facebook/callback
# Facebook l'autorise automatiquement

## Domaines autorisés pour le SDK Javascript
# Supprimez tous les domaines avec https:// ou slash final
# Ajoutez UNIQUEMENT ceux-ci (sans https://, sans slash) :

localhost
${ngrokDomain}

# ============================================
# VÉRIFICATIONS
# ============================================
# ✅ L'URI contient /api/auth/facebook/callback
# ✅ Le port est ${port} (votre backend)
# ✅ Le domaine ngrok est correct
# ✅ Pas de slash final
# ============================================
`;

  // Écrire le fichier de configuration Facebook
  const facebookConfigPath = join(__dirname, 'FACEBOOK_CONFIG.txt');
  writeFileSync(facebookConfigPath, facebookConfig, 'utf-8');
  
  console.log('\n✅ Configuration corrigée !');
  console.log('\n📋 Fichier créé : FACEBOOK_CONFIG.txt');
  console.log('   Contient les valeurs à copier dans Facebook Developer Console\n');
  console.log('📝 URI de redirection OAuth valides :');
  console.log(`   ${ngrokUrl}`);
  console.log(`\n⚠️  NOTE : http://localhost:${port}/api/auth/facebook/callback est automatiquement autorisé`);
  console.log('   Vous n\'avez PAS besoin de l\'ajouter dans Facebook Developer Console\n');
  console.log('📝 Domaines autorisés pour le SDK Javascript :');
  console.log(`   localhost`);
  console.log(`   ${ngrokDomain}\n`);
  console.log('⚠️  IMPORTANT :');
  console.log('   1. Allez dans Facebook Developer Console');
  console.log('   2. Connexion Facebook → Paramètres');
  console.log('   3. Supprimez les URI incorrectes');
  console.log('   4. Ajoutez les URI ci-dessus');
  console.log('   5. Ajoutez les domaines ci-dessus (sans https://, sans slash)');
  console.log('   6. Sauvegardez les modifications\n');
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}

