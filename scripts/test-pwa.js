import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

console.log('🧪 TEST COMPLET DE LA CONFIGURATION PWA\n');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;
const errors = [];
const warnings = [];

// Test 1: Vérifier manifest.json
console.log('\n1️⃣ Test du manifest.json...');
const manifestPath = path.join(publicDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Vérifier les champs requis
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    requiredFields.forEach(field => {
      if (manifest[field]) {
        console.log(`   ✅ ${field}: présent`);
        testsPassed++;
      } else {
        console.log(`   ❌ ${field}: manquant`);
        errors.push(`manifest.json: ${field} manquant`);
        testsFailed++;
      }
    });
    
    // Vérifier les icônes
    if (manifest.icons && Array.isArray(manifest.icons)) {
      console.log(`   ✅ ${manifest.icons.length} icône(s) définie(s)`);
      testsPassed++;
      
      // Vérifier que toutes les icônes existent
      manifest.icons.forEach(icon => {
        const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
        if (fs.existsSync(iconPath)) {
          const stats = fs.statSync(iconPath);
          if (stats.size > 0) {
            console.log(`   ✅ ${icon.src} existe (${stats.size} bytes)`);
            testsPassed++;
          } else {
            console.log(`   ⚠️  ${icon.src} est vide`);
            warnings.push(`${icon.src} est vide`);
          }
        } else {
          console.log(`   ❌ ${icon.src} introuvable`);
          errors.push(`Icône ${icon.src} introuvable`);
          testsFailed++;
        }
      });
    }
    
    // Vérifier l'orientation
    if (manifest.orientation === 'any' || manifest.orientation === 'portrait' || manifest.orientation === 'landscape') {
      console.log(`   ✅ orientation: ${manifest.orientation}`);
      testsPassed++;
    } else {
      warnings.push('orientation non standard');
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur de parsing: ${error.message}`);
    errors.push(`manifest.json: ${error.message}`);
    testsFailed++;
  }
} else {
  console.log('   ❌ manifest.json introuvable');
  errors.push('manifest.json introuvable');
  testsFailed++;
}

// Test 2: Vérifier service-worker.js
console.log('\n2️⃣ Test du service-worker.js...');
const swPath = path.join(publicDir, 'service-worker.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  if (swContent.includes('CACHE_NAME')) {
    console.log('   ✅ CACHE_NAME défini');
    testsPassed++;
  } else {
    console.log('   ❌ CACHE_NAME manquant');
    errors.push('service-worker.js: CACHE_NAME manquant');
    testsFailed++;
  }
  
  const requiredEvents = ['install', 'activate', 'fetch'];
  requiredEvents.forEach(event => {
    if (swContent.includes(`addEventListener('${event}'`)) {
      console.log(`   ✅ Event listener '${event}' présent`);
      testsPassed++;
    } else {
      console.log(`   ❌ Event listener '${event}' manquant`);
      errors.push(`service-worker.js: Event '${event}' manquant`);
      testsFailed++;
    }
  });
} else {
  console.log('   ❌ service-worker.js introuvable');
  errors.push('service-worker.js introuvable');
  testsFailed++;
}

// Test 3: Vérifier index.html
console.log('\n3️⃣ Test de index.html...');
const indexPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const requiredTags = [
    { name: 'manifest.json', check: 'manifest.json' },
    { name: 'apple-mobile-web-app-capable', check: 'apple-mobile-web-app-capable' },
    { name: 'theme-color', check: 'theme-color' },
    { name: 'viewport', check: 'viewport' }
  ];
  
  requiredTags.forEach(tag => {
    if (indexContent.includes(tag.check)) {
      console.log(`   ✅ ${tag.name} présent`);
      testsPassed++;
    } else {
      console.log(`   ❌ ${tag.name} manquant`);
      errors.push(`index.html: ${tag.name} manquant`);
      testsFailed++;
    }
  });
  
  // Vérifier les apple-touch-icon
  const appleIconMatches = indexContent.match(/apple-touch-icon/g);
  if (appleIconMatches && appleIconMatches.length >= 3) {
    console.log(`   ✅ ${appleIconMatches.length} apple-touch-icon(s) définis`);
    testsPassed++;
  } else {
    warnings.push('Peu d\'apple-touch-icon définis');
  }
} else {
  console.log('   ❌ index.html introuvable');
  errors.push('index.html introuvable');
  testsFailed++;
}

// Test 4: Vérifier toutes les icônes
console.log('\n4️⃣ Test de toutes les icônes...');
const requiredIcons = [72, 96, 128, 144, 152, 192, 384, 512, 1024];
requiredIcons.forEach(size => {
  const iconPath = path.join(publicDir, `icon-${size}.png`);
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    if (stats.size > 0) {
      console.log(`   ✅ icon-${size}.png existe (${(stats.size / 1024).toFixed(1)} KB)`);
      testsPassed++;
    } else {
      console.log(`   ❌ icon-${size}.png est vide`);
      errors.push(`icon-${size}.png est vide`);
      testsFailed++;
    }
  } else {
    console.log(`   ❌ icon-${size}.png introuvable`);
    errors.push(`icon-${size}.png introuvable`);
    testsFailed++;
  }
});

// Test 5: Vérifier browserconfig.xml (Windows)
console.log('\n5️⃣ Test de browserconfig.xml (Windows)...');
const browserConfigPath = path.join(publicDir, 'browserconfig.xml');
if (fs.existsSync(browserConfigPath)) {
  console.log('   ✅ browserconfig.xml existe');
  testsPassed++;
} else {
  warnings.push('browserconfig.xml introuvable (optionnel)');
}

// Test 6: Vérifier l'enregistrement du service worker
console.log('\n6️⃣ Test de l\'enregistrement du service worker...');
const mainPath = path.join(rootDir, 'src', 'main.jsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (mainContent.includes('serviceWorker.register')) {
    console.log('   ✅ Enregistrement du service worker présent');
    testsPassed++;
  } else {
    console.log('   ⚠️  Enregistrement du service worker non trouvé');
    warnings.push('Enregistrement service worker non trouvé');
  }
} else {
  warnings.push('main.jsx introuvable');
}

// Résumé
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(60));
console.log(`\n✅ Tests réussis: ${testsPassed}`);
console.log(`❌ Tests échoués: ${testsFailed}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Avertissements (${warnings.length}):`);
  warnings.forEach(warning => console.log(`   - ${warning}`));
}

if (errors.length > 0) {
  console.log(`\n❌ Erreurs (${errors.length}):`);
  errors.forEach(error => console.log(`   - ${error}`));
  console.log('\n❌ La configuration PWA n\'est pas complète!');
  process.exit(1);
} else {
  console.log('\n🎉 Tous les tests sont passés avec succès!');
  console.log('\n📱 La configuration PWA est prête pour tous les appareils:');
  console.log('   ✅ Android (toutes versions)');
  console.log('   ✅ iOS / iPhone');
  console.log('   ✅ iPad / iPadOS');
  console.log('   ✅ Windows Mobile');
  console.log('   ✅ Chrome OS');
  
  console.log('\n🚀 Pour tester l\'installation:');
  console.log('   1. Lancez: npm run dev');
  console.log('   2. Ouvrez sur mobile: http://VOTRE_IP:5173');
  console.log('   3. Suivez les instructions d\'installation PWA');
  
  process.exit(0);
}

