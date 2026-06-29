/** Barrel tests / fallback — Metro natif utilise `.native.ts`, web utilise `.web.ts`. */
export {
  activateAgoraDmVideoPreview,
  ensureAgoraDmPreviewSession,
  peekAgoraDmPreviewSession,
  peekAgoraDmPreviewEngine,
  isAgoraDmPreviewEngineAlive,
  clearAgoraDmPreviewEngineAlive,
  markAgoraDmPreviewHandoff,
  isAgoraDmPreviewHandoffPending,
  consumeAgoraDmPreviewEngine,
  setAgoraDmPreviewVideoEnabled,
  releaseAgoraDmPreviewSession,
} from './agoraDmPreviewSession.web';
