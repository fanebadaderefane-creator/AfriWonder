/**
 * Script ciblé pour corriger les variables non utilisées spécifiques
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Variables spécifiques à préfixer (basées sur les warnings ESLint)
const varsToPrefix = [
  'callbackUrl', 'cancel_url', 'checkoutData', 'coupon_code', 'description',
  'deviceInfo', 'editingTier', 'index', 'isDarkMode', 'isLoading',
  'isSlowConnection', 'message', 'metadata', 'offsetY', 'onSwipeDown',
  'onSwipeUp', 'onToggleDarkMode', 'progress', 'quality', 'queryClient',
  'reason', 'refetch', 'responsive', 'setIsLoading', 'shipping_address',
  'success_url', 'unreadNotifications', 'userId', 'videoId', 'onLikeComment',
  'onShare', 'handleShare', 'previewUrl', 'audioRef', 'filterClass',
  'transactionId', 'cert', 'challenge', 't', 'setDateRange', 'setMapCenter',
  'setCallType', 'navigate', 'likes', 'saves', 'languageWeights', 'creatorWeights',
  'userCommunities', 'loadingCreators', 'loadingCourses', 'loadingEvents',
  'referralCode', 'setReferralCode', 'isAuthenticated', 'badgesLoading',
  'refetchVideos', 'endCallMutation', 'stream', 'call', 'selectedReport',
  'banMutation', 'groupByType', 'user', 'recordedChunks', 'setRecordedChunks',
  'isLive', 'setLiveGifts', 'startLive', 'showGifts', 'setShowGifts',
  'setViewers', 'gifts', 'setGifts', 'setAutoProgress', 'videoRef',
  'cameraInputRef', 'reference'
];

function prefixUnusedVars(content, varName) {
  // Pattern pour trouver les déclarations de variables
  const patterns = [
    // const/let/var varName = ...
    new RegExp(`(const|let|var)\\s+${varName}\\s*=`, 'g'),
    // function param: (varName, ...) or (..., varName)
    new RegExp(`\\(([^)]*\\b${varName}\\b[^)]*)\\)`, 'g'),
    // Destructuring: const { varName } = ...
    new RegExp(`\\{([^}]*\\b${varName}\\b[^}]*)\\}`, 'g'),
    // Array destructuring: const [varName] = ...
    new RegExp(`\\[([^\\]]*\\b${varName}\\b[^\\]]*)\\]`, 'g'),
  ];
  
  let modified = false;
  
  // Vérifier si la variable existe dans le fichier
  if (!new RegExp(`\\b${varName}\\b`).test(content)) {
    return { content, modified: false };
  }
  
  // Compter les occurrences
  const matches = content.match(new RegExp(`\\b${varName}\\b`, 'g')) || [];
  
  // Si elle n'apparaît qu'une fois (seulement la déclaration), elle n'est pas utilisée
  if (matches.length === 1) {
    content = content.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`);
    modified = true;
  } else {
    // Si elle apparaît plusieurs fois, vérifier si c'est juste des déclarations
    // Pattern: chercher les déclarations vs utilisations
    const declarationMatches = content.match(new RegExp(`(const|let|var|function|=>|\\{|\\[).*\\b${varName}\\b`, 'g')) || [];
    const usageMatches = content.match(new RegExp(`[^=]\\b${varName}\\b[^=]`, 'g')) || [];
    
    // Si plus de déclarations que d'utilisations, préfixer
    if (declarationMatches.length > usageMatches.length) {
      // Préfixer seulement dans les déclarations
      for (const pattern of patterns) {
        content = content.replace(pattern, (match) => {
          return match.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`);
        });
      }
      modified = true;
    }
  }
  
  return { content, modified };
}

async function fixAllUnusedVars() {
  const files = await glob('src/**/*.{js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/ui/**', '**/lib/csvService.js'],
    cwd: rootDir,
  });

  let totalFixed = 0;
  const fixedFiles = [];

  for (const file of files) {
    const filePath = join(rootDir, file);
    let content = readFileSync(filePath, 'utf-8');
    let fileModified = false;

    for (const varName of varsToPrefix) {
      const result = prefixUnusedVars(content, varName);
      if (result.modified) {
        content = result.content;
        fileModified = true;
      }
    }

    if (fileModified) {
      writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
      fixedFiles.push(file);
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n✅ Total files fixed: ${totalFixed}`);
  if (fixedFiles.length > 0) {
    console.log('\nFixed files:');
    fixedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

fixAllUnusedVars().catch(console.error);

