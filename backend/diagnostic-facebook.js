/**
 * Script de diagnostic pour Facebook OAuth
 * Vérifie la configuration et teste la connexion
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

console.log('\n🔍 DIAGNOSTIC FACEBOOK OAUTH\n');
console.log('='.repeat(50));

// 1. Vérifier les variables d'environnement
console.log('\n📋 1. Variables d\'environnement :');
const appId = process.env.FACEBOOK_APP_ID?.replace(/^["']|["']$/g, '');
const appSecret = process.env.FACEBOOK_APP_SECRET?.replace(/^["']|["']$/g, '');
const redirectUri = process.env.FACEBOOK_REDIRECT_URI?.replace(/^["']|["']$/g, '');

console.log(`   FACEBOOK_APP_ID: ${appId ? '✅ Présent' : '❌ Manquant'}`);
if (appId) {
  console.log(`      Valeur: ${appId}`);
}

console.log(`   FACEBOOK_APP_SECRET: ${appSecret ? '✅ Présent' : '❌ Manquant'}`);
if (appSecret) {
  console.log(`      Valeur: ${appSecret.substring(0, 10)}...`);
}

console.log(`   FACEBOOK_REDIRECT_URI: ${redirectUri ? '✅ Présent' : '❌ Manquant'}`);
if (redirectUri) {
  console.log(`      Valeur: ${redirectUri}`);
}

// 2. Vérifier le format de l'URI
console.log('\n📋 2. Vérification du format de l\'URI :');
if (redirectUri) {
  const hasHttps = redirectUri.startsWith('https://');
  const hasApi = redirectUri.includes('/api/auth/facebook/callback');
  const noTrailingSlash = !redirectUri.endsWith('/');
  const isNgrok = redirectUri.includes('ngrok');
  
  console.log(`   ✅ HTTPS: ${hasHttps ? 'Oui' : '❌ Non (requis pour Facebook)'}`);
  console.log(`   ✅ Chemin /api: ${hasApi ? 'Oui' : '❌ Non (requis)'}`);
  console.log(`   ✅ Pas de slash final: ${noTrailingSlash ? 'Oui' : '❌ Non'}`);
  console.log(`   ✅ URL ngrok: ${isNgrok ? 'Oui' : '❌ Non (requis pour HTTPS local)'}`);
  
  if (!hasHttps || !hasApi || !noTrailingSlash || !isNgrok) {
    console.log('\n   ⚠️  PROBLÈME DÉTECTÉ dans l\'URI !');
  }
}

// 3. Vérifier que ngrok est actif
console.log('\n📋 3. Vérification ngrok :');
try {
  const response = await fetch('http://localhost:4040/api/tunnels');
  const data = await response.json();
  
  if (data.tunnels && data.tunnels.length > 0) {
    const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
    if (httpsTunnel) {
      const ngrokUrl = httpsTunnel.public_url;
      console.log(`   ✅ ngrok est actif`);
      console.log(`      URL publique: ${ngrokUrl}`);
      
      if (redirectUri && redirectUri.includes(ngrokUrl.replace('https://', '').split('/')[0])) {
        console.log(`   ✅ L'URI correspond à l'URL ngrok actuelle`);
      } else {
        console.log(`   ⚠️  L'URI ne correspond PAS à l'URL ngrok actuelle !`);
        console.log(`      URI configurée: ${redirectUri}`);
        console.log(`      URL ngrok actuelle: ${ngrokUrl}`);
        console.log(`   💡 Solution: Mettez à jour FACEBOOK_REDIRECT_URI dans .env`);
      }
    } else {
      console.log(`   ⚠️  Aucun tunnel HTTPS trouvé dans ngrok`);
    }
  } else {
    console.log(`   ⚠️  Aucun tunnel actif dans ngrok`);
  }
} catch (error) {
  console.log(`   ⚠️  Impossible de se connecter à ngrok (port 4040)`);
  console.log(`      Assurez-vous que ngrok est en cours d'exécution`);
}

// 4. Générer l'URL de test
console.log('\n📋 4. URL de test :');
if (appId && redirectUri) {
  const testUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile`;
  console.log(`   URL OAuth Facebook:`);
  console.log(`   ${testUrl}`);
  console.log(`\n   💡 Testez cette URL dans votre navigateur`);
}

// 5. Instructions pour Facebook Developer Console
console.log('\n📋 5. Vérifications Facebook Developer Console :');
console.log('   Allez sur: https://developers.facebook.com/apps');
console.log('   → Votre application → Connexion Facebook → Paramètres');
console.log('\n   Vérifiez que :');
console.log('   ✅ L\'URI de redirection OAuth contient EXACTEMENT :');
if (redirectUri) {
  console.log(`      ${redirectUri}`);
}
console.log('   ✅ Le domaine est dans "Domaines autorisés pour le SDK Javascript" :');
if (redirectUri) {
  const domain = redirectUri.replace('https://', '').split('/')[0];
  console.log(`      ${domain}`);
}
console.log('   ✅ "Connexion OAuth Web" est activé');
console.log('   ✅ "Connexion OAuth cliente" est activé');
console.log('   ✅ "Imposer le HTTPS" est activé');
console.log('   ✅ Vous avez cliqué sur "Enregistrer les modifications"');

console.log('\n' + '='.repeat(50));
console.log('\n✅ Diagnostic terminé\n');

