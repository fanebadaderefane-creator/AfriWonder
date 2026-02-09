/**
 * Script de test pour obtenir l'API_KEY Orange Money Mali
 * 
 * Usage: node test-orange-money-api.js
 */

const MSISDN = '7701901162';
const AGENT_CODE = '102782';
const PIN = '5324';
const MDP_SIMULATEUR = 'MerchantWP01162';

// Endpoints possibles
const ENDPOINTS = [
  'https://api.orange.ml/oauth/token',
  'https://api.orange.ml/payment/v1/oauth/token',
  'https://api.orange-sonatel.com/oauth/token',
  'https://sandbox.orange.ml/oauth/token',
];

// Configurations à tester
const CONFIGS = [
  { name: 'Agent Code comme secret', client_id: MSISDN, client_secret: AGENT_CODE },
  { name: 'PIN comme secret', client_id: MSISDN, client_secret: PIN },
  { name: 'MDP Simulateur comme secret', client_id: MSISDN, client_secret: MDP_SIMULATEUR },
];

async function testOrangeMoneyAPI(endpoint, config) {
  try {
    console.log(`\n🔍 Test: ${config.name}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Client ID: ${config.client_id}`);
    console.log(`   Client Secret: ${config.client_secret.substring(0, 2)}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${config.client_id}:${config.client_secret}`)
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      })
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      console.log(`   ✅ SUCCÈS !`);
      console.log(`   🔑 API_KEY (access_token): ${data.access_token}`);
      console.log(`   📝 Token Type: ${data.token_type || 'N/A'}`);
      console.log(`   ⏱️  Expires In: ${data.expires_in || 'N/A'} secondes`);
      return data.access_token;
    } else {
      console.log(`   ❌ Échec: ${data.error || JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Test de l\'API Orange Money Mali\n');
  console.log('📋 Informations utilisées:');
  console.log(`   MSISDN: ${MSISDN}`);
  console.log(`   Agent Code: ${AGENT_CODE}`);
  console.log(`   PIN: ${PIN}`);
  console.log(`   MDP Simulateur: ${MDP_SIMULATEUR}\n`);

  let apiKey = null;

  for (const endpoint of ENDPOINTS) {
    for (const config of CONFIGS) {
      apiKey = await testOrangeMoneyAPI(endpoint, config);
      if (apiKey) {
        console.log(`\n✅ API_KEY obtenue avec succès !`);
        console.log(`\n📝 Ajoutez cette ligne dans votre .env.local :`);
        console.log(`VITE_ORANGE_API_KEY=${apiKey}`);
        console.log(`VITE_REACT_APP_ORANGE_API_KEY=${apiKey}`);
        return;
      }
      // Attendre un peu entre les tentatives
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!apiKey) {
    console.log('\n❌ Aucune API_KEY obtenue automatiquement.');
    console.log('\n📞 Actions recommandées:');
    console.log('   1. Vérifier la documentation Orange Money Mali');
    console.log('   2. Contacter le support Orange Money');
    console.log('   3. Utiliser le dashboard Orange Money pour générer l\'API_KEY');
    console.log('\n💡 L\'API_KEY peut être obtenue via:');
    console.log('   - Dashboard Orange Money (section API/Intégration)');
    console.log('   - Support technique Orange Money Mali');
    console.log('   - Documentation API Orange Money');
  }
}

// Exécuter si appelé directement
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exécuter le script
main().catch(console.error);

export { testOrangeMoneyAPI, main };

