/**
 * Script complet pour corriger tous les warnings de variables non utilisées
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Patterns de variables communément non utilisées à préfixer
const commonUnusedVars = [
  'error', 'err', 'e',
  'refetch', 'queryClient',
  'setDateRange', 'setMapCenter', 'setCallType',
  'isLoading', 'setIsLoading',
  'editingTier', 'filteredBadges',
  'deviceInfo', 'isSlowConnection',
  'offsetY', 'progress',
  'metadata', 'description', 'callbackUrl', 'message',
  'success_url', 'cancel_url', 'shipping_address', 'coupon_code',
  'onShare', 'handleShare',
  'videoId', 'onLikeComment',
  'userId', 'previewUrl', 'audioRef', 'filterClass',
  't', 'challenge', 'transactionId', 'cert',
  'cameraInputRef', 'recordedChunks', 'setRecordedChunks',
  'isLive', 'setLiveGifts', 'startLive',
  'showGifts', 'setShowGifts', 'setViewers', 'gifts', 'setGifts',
  'setAutoProgress', 'videoRef',
  'reference', 'selectedReport', 'banMutation',
  'user', 'groupByType',
  'navigate', 'likes', 'saves', 'languageWeights', 'creatorWeights',
  'userCommunities', 'loadingCreators', 'loadingCourses', 'loadingEvents',
  'referralCode', 'setReferralCode',
  'isAuthenticated', 'isDarkMode', 'onToggleDarkMode', 'unreadNotifications',
  'badgesLoading', 'refetchVideos',
];

async function fixAllUnused() {
  const files = await glob('src/**/*.{js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/ui/**'],
    cwd: rootDir,
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = join(rootDir, file);
    let content = readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Fix: const varName = ... but varName is unused
    // We'll prefix common unused vars
    for (const varName of commonUnusedVars) {
      // Pattern: const varName = or let varName = or var varName =
      const constPattern = new RegExp(`(const|let|var)\\s+${varName}\\s*=`, 'g');
      if (constPattern.test(content)) {
        // Check if it's actually used later (simple check)
        const usagePattern = new RegExp(`\\b${varName}\\b`, 'g');
        const matches = content.match(usagePattern) || [];
        // If only appears in declaration, it's unused
        if (matches.length <= 1) {
          content = content.replace(
            new RegExp(`\\b${varName}\\b`, 'g'),
            `_${varName}`
          );
        }
      }
    }

    // Fix destructuring: const { var1, var2 } = ... where vars are unused
    // This is more complex, we'll skip for now

    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n✅ Total files fixed: ${totalFixed}`);
  console.log('⚠️  Note: Some warnings may remain. Run lint to check.');
}

fixAllUnused().catch(console.error);

