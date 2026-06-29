/**

 * Sync canvas aperçu local Agora — UI uniquement (natif).

 */

import type { IRtcEngine } from 'react-native-agora';

import {

  logAgoraSwitchCamera,

  syncAgoraLocalVideoCanvas,

} from './agoraCallVideoBind.native';

import {

  peekAgoraDmActiveChannelCallId,

  peekAgoraDmActiveChannelEngine,

} from './agoraDmActiveChannel';

import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';

import { shouldSyncAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvasPolicy';

import { shouldAgoraDmPreviewStartPreview } from './agoraDmPipPosition';

import { invokeAgoraEngine } from './agoraEngineInvoke';



function previewEngineAliveForCall(callId: string): boolean {

  try {

    // eslint-disable-next-line @typescript-eslint/no-require-imports

    const mod = require('./agoraDmPreviewSession') as typeof import('./agoraDmPreviewSession');

    return mod.isAgoraDmPreviewEngineAlive(callId) || !!mod.peekAgoraDmPreviewEngine(callId);

  } catch {

    return false;

  }

}



function resolveActivePreviewEngine(callId: string): IRtcEngine | null {

  const activeCallId = peekAgoraDmActiveChannelCallId();

  if (activeCallId === callId) {

    const channelEngine = peekAgoraDmActiveChannelEngine();

    if (channelEngine) return channelEngine;

  }

  try {

    // eslint-disable-next-line @typescript-eslint/no-require-imports

    const mod = require('./agoraDmPreviewSession') as typeof import('./agoraDmPreviewSession');

    return mod.peekAgoraDmPreviewEngine(callId);

  } catch {

    return null;

  }

}



/** Re-bind canvas uid 0 — handler hook si monté, sinon moteur canal actif. */

export function refreshAgoraDmLocalPreviewCanvas(reason: string): void {

  const { active, callId, localPreviewRefreshHandler } = useAgoraDmCallUiStore.getState();

  if (

    !shouldSyncAgoraDmLocalPreviewCanvas({

      active,

      callId,

      activeChannelCallId: peekAgoraDmActiveChannelCallId(),

      previewEngineAlive: previewEngineAliveForCall(callId),

    })

  ) {

    return;

  }

  if (typeof localPreviewRefreshHandler === 'function') {

    localPreviewRefreshHandler(reason);

    return;

  }

  const engine = resolveActivePreviewEngine(callId);

  if (!engine) return;

  syncAgoraLocalVideoCanvas(

    engine,

    { callId, reason, source: 'active_channel' },

    { startPreview: shouldAgoraDmPreviewStartPreview(reason) },

  );

}



/** Inverser la caméra depuis l’overlay (écran réduit) sans remonter le hook RTC. */

export function flipAgoraDmLocalCamera(reason: string): void {

  const { active, callId } = useAgoraDmCallUiStore.getState();

  if (

    !shouldSyncAgoraDmLocalPreviewCanvas({

      active,

      callId,

      activeChannelCallId: peekAgoraDmActiveChannelCallId(),

      previewEngineAlive: previewEngineAliveForCall(callId),

    })

  ) {

    return;

  }

  const engine = resolveActivePreviewEngine(callId);

  if (!engine) return;

  logAgoraSwitchCamera({ callId, reason });

  try {

    if (typeof engine.switchCamera === 'function') {

      engine.switchCamera();

    } else {

      invokeAgoraEngine(engine, 'switchCamera');

    }

  } catch {

    invokeAgoraEngine(engine, 'switchCamera');

  }

  syncAgoraLocalVideoCanvas(

    engine,

    { callId, reason: `canvas_after_${reason}` },

    { startPreview: true },

  );

}


