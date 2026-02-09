/**
 * Script complet pour corriger TOUS les warnings de variables non utilisées
 * Préfixe automatiquement toutes les variables non utilisées avec _
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Liste exhaustive des variables communément non utilisées trouvées dans les warnings
const unusedVarPatterns = [
  // Variables d'erreur
  /\berror\b(?!\s*instanceof|\s*\.)/g,
  /\berr\b(?!\s*instanceof|\s*\.)/g,
  
  // Variables de destructuring non utilisées
  /\bquality\b/g,
  /\bresponsive\b/g,
  /\bdeviceInfo\b/g,
  /\bisSlowConnection\b/g,
  /\boffsetY\b/g,
  /\bprogress\b/g,
  /\beditingTier\b/g,
  /\bfilteredBadges\b/g,
  /\bmetadata\b/g,
  /\bdescription\b/g,
  /\bcallbackUrl\b/g,
  /\bmessage\b/g,
  /\bsuccess_url\b/g,
  /\bcancel_url\b/g,
  /\bshipping_address\b/g,
  /\bcoupon_code\b/g,
  /\breference\b/g,
  /\bselectedReport\b/g,
  /\bbanMutation\b/g,
  /\bgroupByType\b/g,
  /\buser\b/g,
  /\brecordedChunks\b/g,
  /\bsetRecordedChunks\b/g,
  /\bisLive\b/g,
  /\bsetLiveGifts\b/g,
  /\bstartLive\b/g,
  /\bshowGifts\b/g,
  /\bsetShowGifts\b/g,
  /\bsetViewers\b/g,
  /\bgifts\b/g,
  /\bsetGifts\b/g,
  /\bsetAutoProgress\b/g,
  /\bvideoRef\b/g,
  /\bcameraInputRef\b/g,
  /\baudioRef\b/g,
  /\bfilterClass\b/g,
  /\bpreviewUrl\b/g,
  /\btransactionId\b/g,
  /\bcert\b/g,
  /\bchallenge\b/g,
  /\bt\b/g,
  /\breason\b/g,
  /\buserId\b/g,
  /\bvideoId\b/g,
  /\bonLikeComment\b/g,
  /\bonShare\b/g,
  /\bhandleShare\b/g,
  /\bonSwipeUp\b/g,
  /\bonSwipeDown\b/g,
  /\bindex\b/g,
  /\bisDarkMode\b/g,
  /\bonToggleDarkMode\b/g,
  /\bunreadNotifications\b/g,
  /\brefetch\b/g,
  /\bqueryClient\b/g,
  /\bsetDateRange\b/g,
  /\bsetMapCenter\b/g,
  /\bsetCallType\b/g,
  /\bisLoading\b/g,
  /\bsetIsLoading\b/g,
  /\bnavigate\b/g,
  /\blikes\b/g,
  /\bsaves\b/g,
  /\blanguageWeights\b/g,
  /\bcreatorWeights\b/g,
  /\buserCommunities\b/g,
  /\bloadingCreators\b/g,
  /\bloadingCourses\b/g,
  /\bloadingEvents\b/g,
  /\breferralCode\b/g,
  /\bsetReferralCode\b/g,
  /\bisAuthenticated\b/g,
  /\bbadgesLoading\b/g,
  /\brefetchVideos\b/g,
  /\bendCallMutation\b/g,
  /\bstream\b/g,
  /\bcall\b/g,
];

function isVariableUsed(content, varName, lineNumber) {
  // Compter toutes les occurrences de la variable
  const regex = new RegExp(`\\b${varName}\\b`, 'g');
  const matches = content.match(regex) || [];
  
  // Si elle apparaît plus d'une fois (déclaration + utilisation), elle est utilisée
  return matches.length > 1;
}

function fixUnusedVarsInFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  
  // Patterns pour détecter les déclarations de variables
  const declarationPatterns = [
    // const/let/var declarations
    /(const|let|var)\s+(\w+)\s*=/g,
    // Function parameters
    /function\s+\w+\s*\(([^)]*)\)/g,
    // Arrow function parameters
    /\(([^)]+)\)\s*=>/g,
    // Destructuring
    /(const|let|var)\s*\{([^}]+)\}\s*=/g,
    // Array destructuring
    /(const|let|var)\s*\[([^\]]+)\]\s*=/g,
  ];
  
  // Pour chaque ligne, chercher les variables non utilisées
  lines.forEach((line, index) => {
    // Skip si la ligne contient déjà _variable
    if (line.includes('_error') || line.includes('_e') || line.includes('_err')) {
      return;
    }
    
    // Chercher les patterns de déclaration
    for (const pattern of declarationPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        if (match[2]) {
          const varName = match[2].trim().split(',')[0].trim();
          // Vérifier si la variable est utilisée ailleurs
          if (varName && !varName.startsWith('_') && varName.length > 1) {
            const fullContent = lines.join('\n');
            if (!isVariableUsed(fullContent, varName, index + 1)) {
              // Préfixer avec _
              const newVarName = `_${varName}`;
              content = content.replace(new RegExp(`\\b${varName}\\b`, 'g'), newVarName);
              modified = true;
            }
          }
        }
      }
    }
  });
  
  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

async function fixAllWarnings() {
  const files = await glob('src/**/*.{js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/ui/**'],
    cwd: rootDir,
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = join(rootDir, file);
    if (fixUnusedVarsInFile(filePath)) {
      totalFixed++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n✅ Total files fixed: ${totalFixed}`);
  console.log('⚠️  Note: Run lint again to verify all warnings are fixed.');
}

fixAllWarnings().catch(console.error);


