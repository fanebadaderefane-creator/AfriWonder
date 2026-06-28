#!/usr/bin/env node
/**
 * Audit strict — tout useEffect/useLayoutEffect du chemin appel Agora DM
 * doit passer par useCallScreenSafeEffect / useCallScreenSafeLayoutEffect
 * (sinon TypeError post agora_join_ok remonte à ErrorBoundary).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'src/call/DirectCallAgoraScreen.native.tsx',
  'src/hooks/useDirectCallAgoraRtc.native.tsx',
  'src/call/callSessionStability.ts',
  'src/call/useCallVideoControlsOverlay.ts',
  'src/components/call/AgoraDmLocalPreviewOverlay.native.tsx',
  'src/call/agoraLocalPreviewSurface.native.tsx',
  'src/call/agoraRemoteVideoSurface.native.tsx',
];

const HOOK_RE = /\buse(?:Layout)?Effect\s*\(/g;
const SAFE_RE = /\buseCallScreenSafe(?:Layout)?Effect\s*\(/g;

function auditFile(rel) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\buse(?:Layout)?Effect\s*\(/.test(line)) continue;
    if (/\buseCallScreenSafe(?:Layout)?Effect\s*\(/.test(line)) continue;

    const prev = lines[i - 1] ?? '';
    const prev2 = lines[i - 2] ?? '';
    if (/useCallScreenSafe(?:Layout)?Effect/.test(prev) || /useCallScreenSafe(?:Layout)?Effect/.test(prev2)) {
      continue;
    }

    violations.push({ line: i + 1, text: line.trim() });
  }

  const rawHookCount = (src.match(HOOK_RE) || []).length;
  const safeCount = (src.match(SAFE_RE) || []).length;

  return { rel, violations, rawHookCount, safeCount };
}

function main() {
  let failed = false;
  console.log('\n🔍 Audit effets React — appel Agora DM\n');

  for (const rel of FILES) {
    const { violations, rawHookCount, safeCount } = auditFile(rel);
    if (violations.length === 0) {
      console.log(`✅ ${rel} — ${safeCount} safe / ${rawHookCount} hooks`);
      continue;
    }
    failed = true;
    console.error(`❌ ${rel} — ${violations.length} useEffect(s) NON protégé(s):`);
    for (const v of violations) {
      console.error(`   L${v.line}: ${v.text}`);
    }
  }

  if (failed) {
    console.error('\n→ Envelopper avec useCallScreenSafeEffect(name, fn, deps) avant tout nouvel APK.');
    process.exit(1);
  }

  console.log('\n✅ Tous les effets du chemin Agora sont protégés.\n');
}

main();
