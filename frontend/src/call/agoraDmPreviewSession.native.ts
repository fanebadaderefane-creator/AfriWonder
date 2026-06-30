/**
 * Session preview Agora DM — une seule caméra / un seul moteur du sonnerie à la fin d’appel.
 * Handoff overlay entrant → DirectCallAgoraScreen sans stopPreview/release (parité WhatsApp).
 */
import type { IRtcEngine } from 'react-native-agora';
import apiClient from '../api/client';
import {
  ensureAgoraFrontCamera,
  logLocalStreamAttached,
} from './agoraCallVideoBind.native';
import {
  canConsumePreviewEngine,
  canMarkPreviewHandoff,
  shouldBlockPreviewSessionRelease,
} from './agoraDmPreviewHandoff';
import { logAfwCall } from './callDiagnosticLog';
import { forceLeaveAgoraDmActiveChannelIfStale } from './agoraDmActiveChannel';
import { requestNativeCallPermissions } from './callNativeMedia';

type PreviewSession = {
  callId: string;
  engine: IRtcEngine;
  appId: string;
  previewActive: boolean;
  cameraFacing: 'front' | 'back';
};

let activeSession: PreviewSession | null = null;
/** Empêche release overlay quand l’utilisateur accepte (moteur repris par l’écran d’appel). */
let handoffCallId: string | null = null;
/** Une seule création moteur à la fois — évite 2× createAgoraRtcEngine (crash vidéo). */
let ensureInFlight: Promise<boolean> | null = null;
let ensureInFlightCallId: string | null = null;
/** Idempotent — plusieurs appels activate en parallèle (layout + bootstrap). */
let activateVideoPreviewInFlight: Promise<boolean> | null = null;
/** Moteur créé ou adopté par le hook — RtcView autorisé tant que non release. */
let engineAliveForCallId: string | null = null;

async function fetchAgoraAppId(callId: string): Promise<string | null> {
  const res = await apiClient.get(`/calls/${encodeURIComponent(callId)}/agora-token`);
  const agora = res.data?.data?.agora ?? res.data?.agora;
  const appId = agora?.appId;
  return appId ? String(appId) : null;
}

export function peekAgoraDmPreviewSession(callId: string): boolean {
  return activeSession?.callId === callId && activeSession.previewActive;
}

/** Moteur preview avant join — sync canvas overlay sans toucher join/signaling. */
export function peekAgoraDmPreviewEngine(callId: string): IRtcEngine | null {
  if (!callId) return null;
  if (activeSession?.callId === callId && activeSession.previewActive) {
    return activeSession.engine;
  }
  return null;
}

export function isAgoraDmPreviewEngineAlive(callId: string): boolean {
  return !!callId && engineAliveForCallId === callId;
}

export function clearAgoraDmPreviewEngineAlive(callId: string, reason: string): void {
  if (engineAliveForCallId !== callId) return;
  engineAliveForCallId = null;
  logAfwCall('agora_preview_engine_alive_cleared', { callId, reason });
}

/** Point d’entrée unique preview vidéo — dedupe ensure + activate parallèles. */
export async function activateAgoraDmVideoPreview(callId: string): Promise<boolean> {
  if (!callId) return false;
  if (peekAgoraDmPreviewSession(callId) || isAgoraDmPreviewEngineAlive(callId)) return true;
  if (activateVideoPreviewInFlight) return activateVideoPreviewInFlight;
  activateVideoPreviewInFlight = ensureAgoraDmPreviewSession(callId).finally(() => {
    activateVideoPreviewInFlight = null;
  });
  return activateVideoPreviewInFlight;
}

async function createPreviewSession(callId: string): Promise<boolean> {
  await forceLeaveAgoraDmActiveChannelIfStale(callId, 'preview_replace_stale_channel');
  await releaseAgoraDmPreviewSession('replace');
  const permitted = await requestNativeCallPermissions(true);
  if (!permitted) {
    logAfwCall('agora_preview_session_denied', { callId });
    return false;
  }
  const appId = await fetchAgoraAppId(callId);
  if (!appId) {
    logAfwCall('agora_preview_session_no_app_id', { callId });
    return false;
  }
  try {
    const mod = await import('react-native-agora');
    const engine = mod.createAgoraRtcEngine();
    engine.initialize({ appId });
    engine.enableVideo();
    engine.enableLocalVideo(true);
    ensureAgoraFrontCamera(engine, { callId, phase: 'preview_session' });
    activeSession = {
      callId,
      engine,
      appId,
      previewActive: true,
      cameraFacing: 'front',
    };
    engineAliveForCallId = callId;
    logLocalStreamAttached({ callId, phase: 'preview_session' });
    // startPreview : uniquement via AgoraLocalPreviewSurface.onLayout → surface_layout_WxH.
    logAfwCall('agora_preview_session_started', { callId });
    return true;
  } catch (e) {
    logAfwCall('agora_preview_session_failed', { callId, error: String(e) });
    return false;
  }
}

export async function ensureAgoraDmPreviewSession(callId: string): Promise<boolean> {
  if (!callId) return false;
  if (activeSession?.callId === callId && activeSession.previewActive) {
    return true;
  }
  if (ensureInFlight && ensureInFlightCallId === callId) {
    return ensureInFlight;
  }
  ensureInFlightCallId = callId;
  ensureInFlight = createPreviewSession(callId).finally(() => {
    ensureInFlight = null;
    ensureInFlightCallId = null;
  });
  return ensureInFlight;
}

export function isAgoraDmPreviewHandoffPending(callId: string): boolean {
  return handoffCallId === callId;
}

export function markAgoraDmPreviewHandoff(callId: string): boolean {
  if (!canMarkPreviewHandoff(callId, activeSession?.callId ?? null)) return false;
  handoffCallId = callId;
  logAfwCall('agora_preview_handoff', { callId });
  logAfwCall('LOCAL_STREAM_REUSED', { callId, phase: 'handoff' });
  return true;
}

export function consumeAgoraDmPreviewEngine(callId: string): IRtcEngine | null {
  if (!canConsumePreviewEngine(callId, activeSession?.callId ?? null) || !activeSession) return null;
  const engine = activeSession.engine;
  activeSession = null;
  engineAliveForCallId = callId;
  if (handoffCallId === callId) handoffCallId = null;
  logAfwCall('agora_preview_engine_consumed', { callId });
  return engine;
}

export function setAgoraDmPreviewVideoEnabled(callId: string, on: boolean): void {
  if (!activeSession || activeSession.callId !== callId) return;
  const engine = activeSession.engine;
  try {
    if (on) {
      engine.enableLocalVideo(true);
      engine.muteLocalVideoStream(false);
      // Android : startPreview uniquement via surface_layout (RtcTextureView monté).
    } else {
      engine.muteLocalVideoStream(true);
      try {
        engine.stopPreview();
      } catch {
        /* ignore */
      }
    }
    activeSession.previewActive = on;
  } catch {
    /* ignore */
  }
}

export async function releaseAgoraDmPreviewSession(reason: string): Promise<void> {
  if (!activeSession) return;
  if (shouldBlockPreviewSessionRelease(activeSession, handoffCallId)) {
    return;
  }
  const { callId, engine } = activeSession;
  activeSession = null;
  if (engineAliveForCallId === callId) engineAliveForCallId = null;
  try {
    engine.stopPreview();
    engine.release();
  } catch {
    /* ignore */
  }
  logAfwCall('agora_preview_session_released', { callId, reason });
}
