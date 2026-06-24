/**
 * Visibilité chrome appel vidéo — style WhatsApp (auto-masque + tap pour réafficher).
 * Logique pure : tests unitaires pour les 6 scénarios produit.
 */

export const CALL_VIDEO_CONTROLS_AUTO_HIDE_MS = 5_000;

export type CallVideoControlsChromeMode = 'visible' | 'autoHidden';

export function shouldAutoHideCallVideoControls(input: {
  isVideoStage: boolean;
  callEnded: boolean;
  minimized: boolean;
  moreMenuOpen: boolean;
  messageModalOpen: boolean;
}): boolean {
  if (!input.isVideoStage) return false;
  if (input.callEnded) return false;
  if (input.minimized) return false;
  if (input.moreMenuOpen || input.messageModalOpen) return false;
  return true;
}

export function resolveCallVideoControlsChromeOpacity(
  mode: CallVideoControlsChromeMode,
): number {
  return mode === 'visible' ? 1 : 0;
}

export function resolveCallVideoControlsChromePointerEvents(
  mode: CallVideoControlsChromeMode,
): 'auto' | 'none' {
  return mode === 'visible' ? 'auto' : 'none';
}

/** Raccrocher reste accessible quand le dock est masqué (exigence produit). */
export function shouldShowPinnedHangup(input: {
  mode: CallVideoControlsChromeMode;
  isVideoStage: boolean;
  callEnded: boolean;
}): boolean {
  if (!input.isVideoStage || input.callEnded) return false;
  return input.mode === 'autoHidden';
}

export function shouldShowTapToRevealOverlay(input: {
  mode: CallVideoControlsChromeMode;
  isVideoStage: boolean;
  callEnded: boolean;
}): boolean {
  return shouldShowPinnedHangup(input);
}

/** Reprise foreground / retour écran : réafficher le chrome. */
export function shouldRevealControlsOnAppResume(
  nextAppState: string,
  isVideoStage: boolean,
  callEnded: boolean,
): boolean {
  return nextAppState === 'active' && isVideoStage && !callEnded;
}
