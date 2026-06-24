#!/usr/bin/env node
/**
 * Vérifie que les Lives natifs utilisent Agora (pas TURN/WebRTC) avec garde-fous surface.
 *
 * Usage: node frontend/scripts/verify-agora-live.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function checkLiveAgoraStack() {
  const hook = read('src/hooks/useAgoraLiveRtc.native.tsx');
  const service = read('src/services/agoraLiveService.ts');
  const stream = read('app/live/stream.tsx');
  const viewer = read('app/live/[id].tsx');
  const guard = read('src/live/agoraLiveSurfaceGuard.ts');

  if (!/RTCPeerConnection|TURN|turn-credentials/.test(hook + stream + viewer)) {
    pass('Lives natifs — pas de WebRTC/TURN', 'Agora uniquement');
  } else {
    fail('Lives natifs — pas de WebRTC/TURN', 'référence TURN/WebRTC détectée');
  }

  if (/agoraLiveService\.joinAsHost/.test(hook) && /joinAsViewer/.test(hook) && /createAgoraRtcEngine/.test(hook)) {
    pass('useAgoraLiveRtc.native', 'token + engine + join');
  } else fail('useAgoraLiveRtc.native', 'incomplet');

  if (/ChannelProfileLiveBroadcasting/.test(hook) && /onTokenPrivilegeWillExpire/.test(hook)) {
    pass('Live broadcasting + renouvellement token', 'OK');
  } else fail('Live broadcasting / token renewal', 'manquant');

  if (/agoraPreviewReady/.test(hook) && /shouldMountAgoraLiveLocalSurface/.test(guard)) {
    pass('Garde-fou surface locale', 'previewReady avant RtcSurfaceView');
  } else fail('Garde-fou surface locale', 'manquant');

  if (/AgoraLiveLocalSurface|AgoraLiveRemoteSurface/.test(hook)) {
    pass('Surfaces Agora protégées', 'OK');
  } else fail('Surfaces Agora protégées', 'manquant');

  if (/initialCameraFront/.test(hook) && /setAgoraLiveCameraFacing/.test(hook)) {
    pass('Caméra front par défaut (live host)', 'OK');
  } else fail('Caméra front live', 'manquant');

  if (/\/live\/\$\{/.test(service) && /\/token/.test(service)) {
    pass('agoraLiveService token API', '/api/proxy/live/:id/token');
  } else fail('agoraLiveService', 'route token manquante');

  if (/agoraPreviewReady/.test(stream) && /useAgoraLiveRtc/.test(stream)) {
    pass('stream.tsx hôte', 'Agora + previewReady');
  } else fail('stream.tsx hôte', 'wiring incomplet');

  if (/useAgoraLiveRtc/.test(viewer) && /AgoraRemoteView/.test(viewer)) {
    pass('[id].tsx spectateur', 'Agora viewer');
  } else fail('[id].tsx spectateur', 'wiring incomplet');
}

function runUnitTests() {
  try {
    execSync('npm run test -- src/live/__tests__/agoraLiveSurfaceGuard.test.ts', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    pass('Tests agoraLiveSurfaceGuard', 'vitest OK');
  } catch (e) {
    fail('Tests agoraLiveSurfaceGuard', (e.stdout || e.message || '').slice(0, 400));
  }
}

checkLiveAgoraStack();
runUnitTests();

const failed = results.filter((r) => !r.ok);
console.log(`\n--- ${results.length - failed.length}/${results.length} checks OK ---`);
if (failed.length) process.exit(1);
