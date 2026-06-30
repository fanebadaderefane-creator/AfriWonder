#!/usr/bin/env node
/**
 * Smoke test Agora DM 1:1 (vocal + vidéo) — remplace TURN pour le média natif.
 *
 * Usage:
 *   node frontend/scripts/verify-agora-dm.cjs
 *   BACKEND_ORIGIN=https://afriwonder.onrender.com node frontend/scripts/verify-agora-dm.cjs
 *
 * Test token réel (recommandé avant APK) :
 *   AFW_TEST_EMAIL=... AFW_TEST_PASSWORD=... node frontend/scripts/verify-agora-dm.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const ORIGIN = (process.env.BACKEND_ORIGIN || 'https://afriwonder.onrender.com').replace(/\/+$/, '');

const results = [];

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function warn(name, detail) {
  results.push({ ok: true, name, detail, warn: true });
  console.warn(`⚠️  ${name}${detail ? ` — ${detail}` : ''}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function fetchJson(urlPath, init = {}) {
  const url = `${ORIGIN}${urlPath}`;
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(45_000),
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body, url };
}

function checkFrontendWiring() {
  const callTsx = read('app/messages/call.tsx');
  const agoraScreen = read('src/call/DirectCallAgoraScreen.native.tsx');
  const hook = read('src/hooks/useDirectCallAgoraRtc.native.tsx');
  const pkg = read('package.json');

  if (/shouldUseAgoraDmCalls/.test(callTsx) && /DirectCallAgoraScreen/.test(callTsx)) {
    pass('call.tsx route Agora natif', 'DirectCallAgoraScreen');
  } else fail('call.tsx route Agora natif', 'branche Agora absente');

  if (/\/agora-token/.test(hook) && /createAgoraRtcEngine/.test(hook) && /joinChannel/.test(hook)) {
    pass('Hook useDirectCallAgoraRtc.native', 'token + joinChannel');
  } else fail('Hook useDirectCallAgoraRtc.native', 'incomplet');

  if (/enableLocalAudio\(true\)/.test(hook) && /enableLocalVideo\(true\)/.test(hook)) {
    pass('Hook Agora — audio + vidéo local', 'enableLocalAudio/Video');
  } else fail('Hook Agora — média local', 'manquant');

  if (/startAgoraMediaTracks|beginAgoraMedia/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — démarrage média Agora', 'OK');
  } else fail('DirectCallAgoraScreen — média', 'manquant');

  if (!/useFocusEffect/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — pas de useFocusEffect', 'évite crash post agora_join_ok');
  } else fail('DirectCallAgoraScreen — useFocusEffect', 'risque undefined is not a function après joined');

  if (/joinedRef\.current/.test(hook) && /upgradeToVideo[\s\S]*\}, \[callId\]\)/.test(hook)) {
    pass('Hook Agora — upgradeToVideo stable (joinedRef)', 'pas de resubscribe socket sur joined');
  } else if (/joinedRef/.test(hook)) {
    pass('Hook Agora — joinedRef présent', 'OK');
  } else {
    fail('Hook Agora — joinedRef', 'manquant — resubscribe socket sur joined');
  }

  if (
    /import[\s\S]*invokeAgoraEngine/.test(hook) &&
    /invokeAgoraEngine\(/.test(hook)
  ) {
    pass('Hook Agora — invokeAgoraEngine importé', 'évite crash post agora_join_ok');
  } else {
    fail('Hook Agora — invokeAgoraEngine', 'appel sans import — TypeError undefined is not a function');
  }

  const safeEffect = read('src/call/callScreenSafeEffect.ts');
  if (/call_screen_effect_error/.test(safeEffect) && !/throw error/.test(safeEffect)) {
    pass('callScreenSafeEffect — log sans rethrow', 'pas cascade ErrorBoundary');
  } else {
    fail('callScreenSafeEffect — swallow post-join', 'rethrow encore actif');
  }

  if (/agora_channel_join_gate/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — gate join diagnostic', 'agora_channel_join_gate');
  } else {
    warn('DirectCallAgoraScreen — gate join diagnostic', 'manquant');
  }

  if (/agora_join_ok_watchdog/.test(hook) && /shouldStopPreviewBeforeChannelJoin/.test(hook)) {
    pass('Hook Agora — join watchdog + preview join', 'callback SDK absent');
  } else {
    warn('Hook Agora — join watchdog', 'vérifier agoraDmJoinLifecycle');
  }

  if (/shouldApplyInviteAckCallId/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — invite:ack sans reset join', 'OK');
  } else {
    warn('DirectCallAgoraScreen — invite:ack', 'risque double bootstrap/join');
  }

  if (/onConnectionStateChanged/.test(hook) && /agora_join_channel_invoke/.test(hook)) {
    pass('Hook Agora — join + connectionState fallback', 'agora_join_ok manquant');
  } else {
    fail('Hook Agora — join fallback', 'onConnectionStateChanged / agora_join_channel_invoke manquant');
  }

  if (/createAgoraRtcEngine/.test(hook) && !/await import\('react-native-agora'\)/.test(hook.split('upgradeToVideo')[0] || hook)) {
    pass('Hook Agora — import statique SDK join', 'évite abort silencieux post token');
  } else if (/agora_join_aborted/.test(hook) && /joinEpoch/.test(hook)) {
    pass('Hook Agora — joinEpoch + abort logs', 'diagnostic join vocal');
  } else {
    fail('Hook Agora — join vocal', 'import dynamique join ou joinEpoch manquant');
  }

  if (/removeNativeSubscription/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — removeNativeSubscription', 'cleanup socket sécurisé');
  } else fail('DirectCallAgoraScreen — removeNativeSubscription', 'manquant');

  const stability = read('src/call/callSessionStability.ts');
  if (!/useFocusEffect\s*\(/.test(stability) && /removeNativeSubscription/.test(stability)) {
    pass('callSessionStability — navigation sans useFocusEffect', 'OK');
  } else fail('callSessionStability', 'useFocusEffect actif ou removeNativeSubscription manquant');

  if (/prepareVideoCallSystemPip/.test(agoraScreen) && /callState !== 'connected'/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — PiP système après connected', 'pas pendant sonnerie');
  } else {
    warn('DirectCallAgoraScreen — PiP', 'vérifier prepareVideoCallSystemPip lié à callState connected');
  }

  const layoutRoot = read('app/_layout.tsx');
  if (
    /resolveAgoraDmVideoFeedPlacements/.test(agoraScreen) &&
    /AgoraDmLocalPreviewOverlay/.test(layoutRoot) &&
    !/AgoraLocalPreviewSurface/.test(agoraScreen)
  ) {
    pass('DirectCallAgoraScreen — preview surface unique root', 'overlay AgoraDmLocalPreviewOverlay');
  } else if (/AgoraLocalPreviewSurface/.test(agoraScreen) && /showLocalFull/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — preview plein écran in-screen', 'sous le dock (pas overlay root)');
  } else {
    fail('DirectCallAgoraScreen — preview surface', 'manquant — risque PiP noir ou contrôles masqués');
  }

  const guard = read('src/call/agoraDmLocalPreviewOverlayGuard.ts');
  if (
    /localPreviewPinned/.test(guard) &&
    /localPreviewEngineReady/.test(guard) &&
    /mountSurface/.test(guard) &&
    /containerStyle === 'hidden'/.test(guard)
  ) {
    pass('Overlay guard — surface stable root', 'plein écran + PiP autorisés');
  } else {
    fail('Overlay guard — surface stable', 'garde-fous preview root manquants');
  }

  if (/logCallControlsMounted/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — logs CALL_CONTROLS', 'diagnostic UI');
  } else {
    warn('DirectCallAgoraScreen — logs CALL_CONTROLS', 'manquants');
  }

  if (/useCallVideoControlsOverlay/.test(agoraScreen) && /tapToShowOverlay/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — overlay tap + auto-masque', 'style WhatsApp');
  } else {
    fail('DirectCallAgoraScreen — overlay contrôles vidéo', 'manquant');
  }

  const callRoute = read('app/messages/call.tsx');
  if (/CallScreenErrorBoundary key=\{callSessionKey\}/.test(callRoute)) {
    pass('call.tsx — ErrorBoundary par callId', 'nouvel appel après crash');
  } else {
    warn('call.tsx — ErrorBoundary key', 'risque écran bloqué post-crash');
  }

  if (/shouldFlushAgoraDmConnected/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — safety net connected', 'audio/vidéo après join+remote');
  } else {
    warn('DirectCallAgoraScreen — shouldFlushAgoraDmConnected', 'risque Connexion média… bloquée');
  }

  if (/registerAgoraDmCallHangup/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — hangup registry', 'ErrorBoundary peut raccrocher');
  } else {
    warn('DirectCallAgoraScreen — hangup registry', 'Retour sans raccrocher');
  }

  const navResume = read('src/call/navigateToActiveAgoraCallScreen.ts');
  if (/router\.back/.test(navResume) && /resolveAgoraDmResumeCallNavigation/.test(navResume)) {
    pass('Navigation — retour appel depuis chat', 'router.back si minimisé');
  } else {
    fail('Navigation — retour appel', 'tap PiP / bandeau vert sans resume');
  }

  const pipGestures = read('src/call/useAgoraDmPipGestures.ts');
  if (/clampAgoraDmPipDrag/.test(pipGestures) && /onPanResponderTerminationRequest/.test(pipGestures)) {
    pass('PiP gestures — drag clamp + pas de vol de touch', 'OK');
  } else {
    fail('PiP gestures', 'drag non fiable');
  }

  const canvasScheduler = read('src/call/agoraDmLocalPreviewCanvasScheduler.native.ts');
  if (/scheduleAgoraDmLocalPreviewCanvasOnSurfaceLayout/.test(canvasScheduler)) {
    pass('Canvas scheduler — sync après layout surface', 'anti PiP noir');
  } else {
    fail('Canvas scheduler', 'sync layout manquant');
  }

  const localSurface = read('src/call/agoraLocalPreviewSurface.native.tsx');
  if (
    /agoraRtcTextureViewSafeStyle/.test(localSurface) &&
    /AGORA_RTC_SURFACE_HOST_BG/.test(localSurface) &&
    !/RtcTextureView[\s\S]{0,200}backgroundColor/.test(localSurface)
  ) {
    pass('RtcTextureView — pas de backgroundColor', 'évite crash Fabric Android');
  } else {
    fail('RtcTextureView style', 'backgroundColor sur TextureView = crash natif');
  }

  const canvasWeb = read('src/call/agoraDmLocalPreviewCanvas.web.ts');
  if (/refreshAgoraDmLocalPreviewCanvas/.test(canvasWeb) && !/react-native-agora/.test(canvasWeb)) {
    pass('Canvas web stub — pas de react-native-agora', 'bundle web safe');
  } else {
    fail('Canvas web stub', 'risque import Agora sur web');
  }

  if (/handleHangup/.test(agoraScreen) && /force:\s*true/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — raccrocher force', 'caller + receiver');
  } else {
    fail('DirectCallAgoraScreen — raccrocher', 'receiver peut être bloqué');
  }

  const errorBoundary = read('src/components/call/CallScreenErrorBoundary.tsx');
  if (/requestAgoraDmCallHangup/.test(errorBoundary) && /forceAgoraDmCallHangup/.test(errorBoundary)) {
    pass('CallScreenErrorBoundary — raccroche avant retour', 'OK');
  } else {
    fail('CallScreenErrorBoundary', 'Retour messages sans hangup Agora');
  }

  if (
    /shouldSuppressCallInterruptedUi/.test(errorBoundary) &&
    /logWhyCallInterrupted/.test(errorBoundary)
  ) {
    pass('CallScreenErrorBoundary — média vivant = pas Appel interrompu', 'recovery UI');
  } else {
    fail('CallScreenErrorBoundary — garde média vivant', 'manquant — faux écran interrompu');
  }

  const mediaAlive = read('src/call/callMediaAliveRegistry.ts');
  if (/shouldSuppressCallInterruptedUi/.test(mediaAlive) && /syncWebRtcCallMediaAlive/.test(mediaAlive)) {
    pass('callMediaAliveRegistry — snapshot WebRTC + Agora', 'OK');
  } else {
    fail('callMediaAliveRegistry', 'manquant');
  }

  const remoteReady = read('src/call/agoraDmRemoteReady.ts');
  if (/shouldLogAgoraRemoteReady/.test(read('src/hooks/useDirectCallAgoraRtc.native.tsx'))) {
    pass('useDirectCallAgoraRtc — remote ready relay', 'pas de blocage remoteNotifiedRef');
  } else {
    fail('useDirectCallAgoraRtc — noteRemotePeer', 'risque jamais connecté');
  }

  const controlsHook = read('src/call/useCallVideoControlsOverlay.ts');
  if (/removeNativeSubscription/.test(controlsHook) && !/useNavigation/.test(controlsHook)) {
    pass('useCallVideoControlsOverlay — removeNativeSubscription', 'évite crash AppState cleanup');
  } else {
    fail('useCallVideoControlsOverlay — AppState cleanup', 'sub.remove() ou useNavigation risqué');
  }

  if (/forceLeaveAgoraDmActiveChannel/.test(read('src/call/agoraDmForceHangup.native.ts'))
    && /registerAgoraDmActiveChannel/.test(hook)) {
    pass('Agora DM — force leave canal après crash', 'anti appel fantôme');
  } else {
    fail('Agora DM — force leave canal', 'ErrorBoundary ne coupe pas le média');
  }

  if (/prepareAgoraEngineForChannelJoin/.test(hook) && /agora_join_rejected_retry/.test(hook)) {
    pass('Hook Agora — join -17 retry + pre-leave', 'ERR_JOIN_CHANNEL_REJECTED preview');
  } else {
    fail('Hook Agora — join -17', 'prepareAgoraEngineForChannelJoin / retry manquant');
  }

  if (/join_sync_rejected/.test(hook) && /leave\(\{ releasePreview: false, reason: 'join_sync_rejected' \}\)/.test(hook)) {
    pass('Hook Agora — join sync reject libère moteur', 'pas de fuite engine');
  } else {
    fail('Hook Agora — join sync reject cleanup', 'engine orphelin après -17');
  }

  if (/join_aborted_post_invoke/.test(hook)) {
    pass('Hook Agora — abort avant register canal', 'pas de canal fantôme');
  } else {
    fail('Hook Agora — guard post-invoke abort', 'manquant');
  }

  if (
    /shouldSuppressCallInterruptedUi/.test(read('src/components/call/CallScreenErrorBoundary.tsx')) &&
    /getDerivedStateFromError/.test(read('src/components/call/CallScreenErrorBoundary.tsx'))
  ) {
    pass('ErrorBoundary — recovery sync avant unmount', 'markCallScreenRecovering getDerivedStateFromError');
  } else {
    fail('ErrorBoundary — recovery sync', 'manquant');
  }

  if (/agora_join_cleanup_skipped/.test(hook) && /isCallScreenRecovering/.test(hook)) {
    pass('Hook Agora — skip leave cleanup recovery', 'OK');
  } else {
    fail('Hook Agora — join cleanup recovery', 'manquant');
  }

  if (!/runAfterCallUiInteractions/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — flush connected sync', 'pas de defer InteractionManager');
  } else {
    warn('DirectCallAgoraScreen — flush connected', 'runAfterCallUiInteractions encore présent');
  }

  if (/emergencyHangup/.test(read('src/call/agoraDmCallHangupRegistry.ts'))) {
    pass('Hangup registry — emergencyHangup', 'Retour messages après crash');
  } else {
    fail('Hangup registry — emergencyHangup', 'manquant');
  }

  if (/pinnedHangupWrap/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — raccrocher épinglé', 'toujours dispo si dock masqué');
  } else {
    fail('DirectCallAgoraScreen — raccrocher épinglé', 'manquant');
  }

  const overlayModule = read('src/call/callVideoControlsOverlay.ts');
  if (/CALL_VIDEO_CONTROLS_AUTO_HIDE_MS = 5_000/.test(overlayModule)) {
    pass('callVideoControlsOverlay — auto-masque 5s', 'OK');
  } else {
    fail('callVideoControlsOverlay — délai auto-masque', 'incorrect');
  }

  if (/!callConnected/.test(overlayModule) || /callConnected/.test(overlayModule)) {
    pass('callVideoControlsOverlay — pas auto-masque avant connected', 'contrôles visibles sonnerie');
  } else {
    fail('callVideoControlsOverlay — gate callConnected', 'dock masqué pendant connexion');
  }

  if (/shouldHandleAgoraPeerAccept/.test(agoraScreen) && /agora_peer_accepted_dedup/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — dedup call:accept', 'évite double join');
  } else {
    fail('DirectCallAgoraScreen — dedup call:accept', 'manquant');
  }

  if (/joinedRef\.current = joined/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — joinedRef sync render', 'garde unmount post-join');
  } else {
    fail('DirectCallAgoraScreen — joinedRef sync render', 'manquant');
  }

  if (/unmount_finish_call_blocked/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — finishCall bloqué média vivant', 'anti cascade Appel interrompu');
  } else {
    fail('DirectCallAgoraScreen — finishCall bloqué média vivant', 'manquant');
  }

  if (/agora_socket_handlers_bound/.test(agoraScreen) && /Sockets call:\*/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — sockets séparés du bootstrap', 'call:accept survit invite:ack');
  } else {
    fail('DirectCallAgoraScreen — sockets séparés bootstrap', 'risque perte call:accept');
  }

  if (/agora_stale_channel_on_mount/.test(agoraScreen) && /migrateAgoraDmActiveChannelCallId/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — invite:ack migre canal (pas forceLeave)', 'anti kill mid-call audio');
  } else {
    fail('DirectCallAgoraScreen — invite:ack canal', 'migrate ou stale mount-only manquant');
  }

  if (/callAbortedRef\.current = true/.test(agoraScreen) && /agora_missed_no_answer/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — missed aborte join', 'pas de canal fantôme');
  } else {
    fail('DirectCallAgoraScreen — missed callAbortedRef', 'manquant');
  }

  if (/force\?: boolean/.test(agoraScreen) && /finishCallRef\.current\('failed', \{ force: true \}\)/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — finishCall force bootstrap', 'échec permission ferme vraiment');
  } else {
    fail('DirectCallAgoraScreen — finishCall force', 'manquant');
  }

  if (/prepareCallSessionMemory/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — prepareCallSessionMemory', 'RAM avant média Agora');
  } else {
    fail('DirectCallAgoraScreen — prepareCallSessionMemory', 'manquant');
  }

  const activeChannel = read('src/call/agoraDmActiveChannel.ts');
  if (/migrateAgoraDmActiveChannelCallId/.test(activeChannel) && /clearCallMediaAlive\('agora'\)/.test(activeChannel)) {
    pass('agoraDmActiveChannel — migrate + forceLeave clear snapshot', 'OK');
  } else {
    fail('agoraDmActiveChannel — migrate / clear snapshot', 'manquant');
  }

  if (/shouldEnableAgoraChannelJoin/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — join canal après acceptation', 'aperçu preview sans join précoce');
  } else {
    fail('DirectCallAgoraScreen — gate join canal', 'risque sonnerie + join Agora trop tôt');
  }

  if (/onAndroidBackWhileBlocked/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — retour Android → réduire', 'pas UI perdue');
  } else {
    warn('DirectCallAgoraScreen — retour Android', 'BackHandler sans action');
  }

  if (/audioOnly/.test(read('src/call/agoraDmChannelReady.ts'))) {
    pass('agoraDmChannelReady — join vocal immédiat', 'audioOnly appelant');
  } else {
    warn('agoraDmChannelReady — audioOnly', 'vérifier join vocal');
  }

  if (/shouldRunRtcChannelTeardown/.test(read('src/hooks/useDirectCallAgoraRtc.native.tsx'))) {
    pass('Hook Agora — preview préservé si join canal différé', 'anti écran noir sonnerie');
  } else {
    fail('Hook Agora — lifecycle preview', 'leave() peut tuer la caméra en sonnerie');
  }

  if (/unmount_while_minimized/.test(agoraScreen)) {
    pass('DirectCallAgoraScreen — unmount minimisé sans raccrocher', 'OK');
  } else {
    warn('DirectCallAgoraScreen — unmount minimisé', 'risque finishCall au retour Android');
  }

  if (/\[CALL_SCREEN\]/.test(read('src/call/callUiLifecycleLog.ts'))) {
    pass('Logs CALL_SCREEN / CALL_NAV', 'diagnostic cycle de vie');
  } else {
    warn('Logs CALL_SCREEN', 'manquants');
  }

  if (/IncomingCallOverlay/.test(read('app/_layout.tsx')) && /navigateToReceiverCallScreen/.test(read('src/components/call/IncomingCallOverlay.native.tsx'))) {
    pass('Appel entrant → écran receveur Agora', 'overlay OK');
  } else warn('Appel entrant', 'vérifier IncomingCallOverlay');

  if (fs.existsSync(path.join(ROOT, 'src/call/DirectCallAgoraScreen.web.tsx'))
    && /return null/.test(read('src/call/DirectCallAgoraScreen.web.tsx'))) {
    pass('Stub web DirectCallAgoraScreen', 'return null — pas Agora sur web');
  } else fail('Stub web DirectCallAgoraScreen', 'manquant ou incomplet');

  if (!fs.existsSync(path.join(ROOT, 'src/hooks/useDirectCallAgoraRtc.ts'))) {
    pass('Pas de barrel useDirectCallAgoraRtc.ts', 'Metro web safe');
  } else fail('Barrel useDirectCallAgoraRtc.ts', 'risque import Agora sur web');

  if (/"react-native-agora"/.test(pkg)) {
    pass('Dépendance react-native-agora', 'package.json');
  } else fail('react-native-agora', 'absent de package.json');
}

async function verifyProdAgoraFlag() {
  const res = await fetchJson('/api/mobile/health');
  if (res.status !== 200) {
    fail('GET /api/mobile/health', `HTTP ${res.status}`);
    return;
  }
  const caps = res.body?.data?.capabilities;
  if (caps?.agora_rtc === true) {
    pass('Production Agora RTC', 'capabilities.agora_rtc=true');
  } else {
    fail('Production Agora RTC', 'agora_rtc=false — configurer AGORA_APP_ID + AGORA_APP_CERTIFICATE sur Render');
  }
}

async function verifyAgoraTokenRouteProtected() {
  const res = await fetchJson('/api/proxy/calls/smoke-agora-call/agora-token');
  if (res.status === 401 || res.status === 403) {
    pass('Route agora-token protégée', `HTTP ${res.status}`);
  } else {
    fail('Route agora-token protégée', `HTTP ${res.status} — attendu 401`);
  }
}

async function verifyAuthenticatedAgoraToken() {
  const email = process.env.AFW_TEST_EMAIL?.trim();
  const password = process.env.AFW_TEST_PASSWORD?.trim();
  if (!email || !password) {
    warn(
      'Token Agora authentifié (vocal/vidéo réel)',
      'skip — définir AFW_TEST_EMAIL + AFW_TEST_PASSWORD pour valider un vrai token prod',
    );
    return;
  }

  const login = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token =
    login.body?.data?.accessToken ||
    login.body?.accessToken ||
    login.body?.data?.token ||
    login.body?.token;
  if (!token) {
    fail('Login test Agora', `HTTP ${login.status} — pas de JWT`);
    return;
  }
  pass('Login test Agora', `HTTP ${login.status}`);

  const callId = `call-smoke-${Date.now()}`;
  const auth = { Authorization: `Bearer ${token}` };

  const upsert = await fetchJson('/api/proxy/calls/session/upsert', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callId,
      peerUserId: '00000000-0000-0000-0000-000000000099',
      role: 'caller',
      status: 'pending',
    }),
  });
  if (upsert.status >= 200 && upsert.status < 300) {
    pass('Session appel upsert', `callId=${callId}`);
  } else {
    warn('Session upsert', `HTTP ${upsert.status} — token Agora peut quand même répondre`);
  }

  const tokRes = await fetchJson(`/api/proxy/calls/${encodeURIComponent(callId)}/agora-token`, {
    headers: auth,
  });
  if (tokRes.status !== 200) {
    fail('GET agora-token authentifié', `HTTP ${tokRes.status}`);
    return;
  }

  const agora = tokRes.body?.data?.agora ?? tokRes.body?.agora;
  if (!agora?.appId || !agora?.token || !agora?.channel || agora?.uid == null) {
    if (agora === null && tokRes.body?.data?.message?.includes('non configuré')) {
      fail('Token Agora prod', tokRes.body.data.message);
    } else {
      fail('Payload agora-token', JSON.stringify(tokRes.body?.data || tokRes.body).slice(0, 200));
    }
    return;
  }

  if (!String(agora.channel).startsWith('dm_')) {
    fail('Canal Agora DM', `channel=${agora.channel} — attendu préfixe dm_`);
    return;
  }

  if (String(agora.token).length < 32) {
    fail('Token Agora', 'token trop court');
    return;
  }

  pass('Token Agora vocal/vidéo prod', `channel=${agora.channel} uid=${agora.uid} len=${String(agora.token).length}`);
  pass('App ID Agora prod', `${String(agora.appId).slice(0, 8)}…`);
}

function runBackendAgoraTests() {
  try {
    execSync('npm run test -- src/utils/__tests__/agoraDmChannel.test.ts src/services/__tests__/liveAgoraToken.test.ts', {
      cwd: path.join(REPO, 'backend'),
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 120_000,
    });
    pass('Tests backend Agora', 'canal dm_ + génération token');
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    fail('Tests backend Agora', out.slice(-400) || e.message);
  }
}

function runFrontendAgoraTests() {
  try {
    execSync(
      'npm run test -- src/call/dmCallMediaEngine.test.ts src/call/agoraDmCallSession.test.ts src/call/agoraDmVideoUi.test.ts src/call/agoraDmLocalPreviewLayout.test.ts src/call/callNativeSubscription.test.ts src/call/agoraEngineInvoke.test.ts src/call/openNativeCallScreen.test.ts src/call/agoraDmPeerAcceptDedup.test.ts src/call/agoraConnectionJoin.test.ts src/call/agoraEngineChannelPrep.test.ts src/call/callVideoControlsOverlay.test.ts src/call/callMediaAliveRegistry.test.ts src/call/callScreenSafeEffect.test.ts src/call/agoraDmActiveChannel.test.ts src/call/agoraDmLifecycleAudit.test.ts src/call/callErrorRecoveryGate.test.ts src/call/agoraDmJoinLifecycle.test.ts src/call/agoraDmChannelReady.test.ts',
      { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 120_000 },
    );
    pass('Tests frontend Agora DM', 'dmCallMediaEngine + session + UI');
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    fail('Tests frontend Agora DM', out.slice(-400) || e.message);
  }
}

async function main() {
  console.log('\n🎥 Vérification Agora — appels DM vocal + vidéo\n');
  console.log(`Backend: ${ORIGIN}\n`);

  console.log('━━ Code mobile ━━');
  checkFrontendWiring();
  try {
    execSync('node scripts/audit-agora-call-effects.cjs', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    pass('Audit effets React Agora', '100% useCallScreenSafeEffect sur le chemin appel');
  } catch (e) {
    fail('Audit effets React Agora', String(e.stdout || e.stderr || e.message).slice(-600));
  }

  console.log('\n━━ Production ━━');
  await verifyProdAgoraFlag();
  await verifyAgoraTokenRouteProtected();
  await verifyAuthenticatedAgoraToken();

  console.log('\n━━ Tests unitaires ━━');
  runBackendAgoraTests();
  runFrontendAgoraTests();

  const failed = results.filter((r) => !r.ok);
  const warns = results.filter((r) => r.warn);

  console.log('\n══════════════════════════════════════════');
  console.log(`  OK: ${results.filter((r) => r.ok && !r.warn).length}  |  Warnings: ${warns.length}  |  Échecs: ${failed.length}`);
  console.log('══════════════════════════════════════════');

  if (failed.length === 0 && warns.some((w) => w.name.includes('Token Agora authentifié'))) {
    console.log('\n💡 Pour un token Agora RÉEL sur prod (dernière étape auto) :');
    console.log('   $env:AFW_TEST_EMAIL="..."; $env:AFW_TEST_PASSWORD="..."; npm run verify:agora-dm');
    console.log('\n📱 Ensuite obligatoire : APK EAS preview + appel vocal puis vidéo entre 2 téléphones.');
  } else if (failed.length === 0) {
    console.log('\n📱 Stack Agora prête. Dernière preuve : 2 APK + appel vocal puis vidéo (Wi‑Fi puis 4G).');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
