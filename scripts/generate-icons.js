import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vérifier si sharp est disponible
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.error('❌ La bibliothèque "sharp" n\'est pas installée.');
  console.log('📦 Installation de sharp...');
  console.log('   Exécutez: npm install sharp --save-dev');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
// Source : logo AfriWonder — priorité au fichier "AfriWonder logo.png" (votre logo actuel)
const possibleLogos = ['AfriWonder logo.png', 'logoafriwonder.png', 'logoafriconnect.png'];
let logoPath = null;
for (const name of possibleLogos) {
  const p = path.join(publicDir, name);
  if (fs.existsSync(p)) {
    logoPath = p;
    break;
  }
}

// Toutes les tailles d'icônes nécessaires pour tous les appareils
const iconSizes = [
  72,   // Android petites
  96,   // Android
  128,  // Chrome
  144,  // Windows tiles
  152,  // iPad
  192,  // Android standard
  384,  // Android large
  512,  // PWA standard
  1024  // iPad Pro, iOS splash
];

// Vérifier si le logo existe
if (!logoPath) {
  console.error(`❌ Aucun logo trouvé dans public/. Placez l'un de ces fichiers: ${possibleLogos.join(', ')}`);
  process.exit(1);
}
console.log(`📷 Source: ${path.basename(logoPath)}\n`);

console.log('🎨 Génération des icônes PWA pour tous les appareils...');
console.log(`📱 Tailles: ${iconSizes.join(', ')}px\n`);

try {
  // Générer toutes les icônes
  for (const size of iconSizes) {
    const iconPath = path.join(publicDir, `icon-${size}.png`);
    
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(iconPath);
    
    console.log(`✅ icon-${size}.png créé (${size}x${size}px)`);
  }
  
  console.log('\n🎉 Toutes les icônes PWA ont été générées avec succès!');
  console.log(`📁 Fichiers créés dans: ${publicDir}`);
  console.log('\n📱 Compatibilité:');
  console.log('   ✅ Android (toutes versions)');
  console.log('   ✅ iOS / iPhone');
  console.log('   ✅ iPad / iPadOS');
  console.log('   ✅ Windows Mobile');
  console.log('   ✅ Chrome OS');
} catch (error) {
  console.error('❌ Erreur lors de la génération des icônes:', error.message);
  process.exit(1);
}

