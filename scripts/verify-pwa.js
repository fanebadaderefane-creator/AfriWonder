import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

console.log('🔍 Vérification de la configuration PWA...\n');

let errors = [];
let warnings = [];
let success = [];

// 1. Vérifier manifest.json
console.log('1️⃣ Vérification du manifest.json...');
const manifestPath = path.join(publicDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
  // Vérifier les champs requis
  if (!manifest.name) errors.push('manifest.json: "name" manquant');
  else success.push('✅ manifest.json: "name" présent');
  
  if (!manifest.short_name) errors.push('manifest.json: "short_name" manquant');
  else success.push('✅ manifest.json: "short_name" présent');
  
  if (!manifest.start_url) errors.push('manifest.json: "start_url" manquant');
  else success.push('✅ manifest.json: "start_url" présent');
  
  if (!manifest.display) errors.push('manifest.json: "display" manquant');
  else success.push('✅ manifest.json: "display" présent');
  
  if (!manifest.icons || manifest.icons.length === 0) {
    errors.push('manifest.json: "icons" manquant ou vide');
  } else {
    success.push(`✅ manifest.json: ${manifest.icons.length} icône(s) définie(s)`);
    
    // Vérifier que les icônes référencées existent
    manifest.icons.forEach((icon, index) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      if (!fs.existsSync(iconPath)) {
        errors.push(`manifest.json: Icône "${icon.src}" introuvable`);
      } else {
        success.push(`✅ Icône "${icon.src}" trouvée`);
      }
    });
  }
  
  if (manifest.theme_color) success.push(`✅ manifest.json: theme_color = ${manifest.theme_color}`);
  if (manifest.background_color) success.push(`✅ manifest.json: background_color = ${manifest.background_color}`);
  
  } catch (error) {
    errors.push(`manifest.json: Erreur de parsing JSON - ${error.message}`);
  }
} else {
  errors.push('manifest.json introuvable');
}

// 2. Vérifier service-worker.js
console.log('\n2️⃣ Vérification du service-worker.js...');
const swPath = path.join(publicDir, 'service-worker.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  if (swContent.includes('CACHE_NAME')) {
    success.push('✅ service-worker.js: CACHE_NAME défini');
  }
  if (swContent.includes('addEventListener')) {
    success.push('✅ service-worker.js: Event listeners présents');
  }
  if (swContent.includes('install') && swContent.includes('activate') && swContent.includes('fetch')) {
    success.push('✅ service-worker.js: Tous les événements requis présents');
  } else {
    warnings.push('service-worker.js: Certains événements peuvent manquer');
  }
} else {
  errors.push('service-worker.js introuvable');
}

// 3. Vérifier index.html
console.log('\n3️⃣ Vérification de index.html...');
const indexPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('manifest.json')) {
    success.push('✅ index.html: Référence au manifest.json présente');
  } else {
    errors.push('index.html: Référence au manifest.json manquante');
  }
  if (indexContent.includes('theme-color')) {
    success.push('✅ index.html: Meta theme-color présent');
  }
  if (indexContent.includes('apple-mobile-web-app-capable')) {
    success.push('✅ index.html: Support iOS présent');
  }
} else {
  errors.push('index.html introuvable');
}

// 4. Vérifier l'enregistrement du service worker dans main.jsx
console.log('\n4️⃣ Vérification de l\'enregistrement du service worker...');
const mainPath = path.join(rootDir, 'src', 'main.jsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (mainContent.includes('serviceWorker.register')) {
    success.push('✅ main.jsx: Enregistrement du service worker présent');
  } else {
    warnings.push('main.jsx: Enregistrement du service worker non trouvé');
  }
} else {
  warnings.push('main.jsx introuvable');
}

// 5. Vérifier les icônes
console.log('\n5️⃣ Vérification des icônes...');
const icon192Path = path.join(publicDir, 'icon-192.png');
const icon512Path = path.join(publicDir, 'icon-512.png');

if (fs.existsSync(icon192Path)) {
  const stats = fs.statSync(icon192Path);
  if (stats.size > 0) {
    success.push('✅ icon-192.png existe et n\'est pas vide');
  } else {
    errors.push('icon-192.png est vide');
  }
} else {
  errors.push('icon-192.png introuvable');
}

if (fs.existsSync(icon512Path)) {
  const stats = fs.statSync(icon512Path);
  if (stats.size > 0) {
    success.push('✅ icon-512.png existe et n\'est pas vide');
  } else {
    errors.push('icon-512.png est vide');
  }
} else {
  errors.push('icon-512.png introuvable');
}

// Résumé
console.log('\n' + '='.repeat(50));
console.log('📊 RÉSUMÉ DE LA VÉRIFICATION PWA');
console.log('='.repeat(50));

if (success.length > 0) {
  console.log('\n✅ Succès:');
  success.forEach(msg => console.log(`   ${msg}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  Avertissements:');
  warnings.forEach(msg => console.log(`   ${msg}`));
}

if (errors.length > 0) {
  console.log('\n❌ Erreurs:');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log('\n❌ La configuration PWA n\'est pas complète!');
  process.exit(1);
} else {
  console.log('\n🎉 Tous les fichiers PWA sont correctement configurés!');
  console.log('\n📱 Pour tester l\'installation PWA:');
  console.log('   1. Construisez l\'application: npm run build');
  console.log('   2. Servez les fichiers en production');
  console.log('   3. Ouvrez dans un navigateur mobile');
  console.log('   4. Utilisez "Ajouter à l\'écran d\'accueil"');
  process.exit(0);
}

