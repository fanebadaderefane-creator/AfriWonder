import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { removeNativeSubscription } from './callNativeSubscription';
import {
  logCallControlsHidden,
  logCallControlsVisible,
} from './callControlsLifecycleLog';
import {
  CALL_VIDEO_CONTROLS_AUTO_HIDE_MS,
  type CallVideoControlsChromeMode,
  resolveCallVideoControlsChromeOpacity,
  resolveCallVideoControlsChromePointerEvents,
  shouldAutoHideCallVideoControls,
  shouldRevealControlsOnAppResume,
  shouldShowPinnedHangup,
  shouldShowTapToRevealOverlay,
} from './callVideoControlsOverlay';

export type UseCallVideoControlsOverlayInput = {
  isVideoStage: boolean;
  callEnded: boolean;
  minimized: boolean;
  moreMenuOpen: boolean;
  messageModalOpen: boolean;
  callId: string;
  role: string;
};

export function useCallVideoControlsOverlay(input: UseCallVideoControlsOverlayInput) {
  const [chromeMode, setChromeMode] = useState<CallVideoControlsChromeMode>('visible');
  const chromeModeRef = useRef(chromeMode);
  chromeModeRef.current = chromeMode;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const logMeta = useCallback(
    () => ({
      callId: inputRef.current.callId,
      role: inputRef.current.role,
      engine: 'agora' as const,
    }),
    [],
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const canAutoHide = useCallback(() => {
    const cur = inputRef.current;
    return shouldAutoHideCallVideoControls({
      isVideoStage: cur.isVideoStage,
      callEnded: cur.callEnded,
      minimized: cur.minimized,
      moreMenuOpen: cur.moreMenuOpen,
      messageModalOpen: cur.messageModalOpen,
    });
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();
    if (!canAutoHide()) return;
    hideTimerRef.current = setTimeout(() => {
      if (!canAutoHide()) return;
      if (chromeModeRef.current === 'autoHidden') return;
      setChromeMode('autoHidden');
      logCallControlsHidden({ ...logMeta(), reason: 'auto_hide' });
    }, CALL_VIDEO_CONTROLS_AUTO_HIDE_MS);
  }, [canAutoHide, clearHideTimer, logMeta]);

  const showControls = useCallback(() => {
    clearHideTimer();
    if (chromeModeRef.current !== 'visible') {
      setChromeMode('visible');
      logCallControlsVisible({ ...logMeta(), reason: 'tap_or_resume' });
    }
    scheduleAutoHide();
  }, [clearHideTimer, logMeta, scheduleAutoHide]);

  const bumpControlsActivity = useCallback(() => {
    showControls();
  }, [showControls]);

  useEffect(() => {
    const cur = inputRef.current;
    if (!cur.isVideoStage || cur.callEnded) {
      clearHideTimer();
      setChromeMode('visible');
      return;
    }
    showControls();
    return () => {
      clearHideTimer();
    };
  }, [input.isVideoStage, input.callEnded, clearHideTimer, showControls]);

  useEffect(() => {
    if (input.moreMenuOpen || input.messageModalOpen) {
      showControls();
    }
  }, [input.messageModalOpen, input.moreMenuOpen, showControls]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const cur = inputRef.current;
      if (
        shouldRevealControlsOnAppResume(next, cur.isVideoStage, cur.callEnded)
      ) {
        showControls();
      }
    });
    return () => removeNativeSubscription(sub);
  }, [showControls]);

  const overlayInput = {
    mode: chromeMode,
    isVideoStage: input.isVideoStage,
    callEnded: input.callEnded,
  };

  return {
    chromeMode,
    chromeOpacity: resolveCallVideoControlsChromeOpacity(chromeMode),
    chromePointerEvents: resolveCallVideoControlsChromePointerEvents(chromeMode),
    showPinnedHangup: shouldShowPinnedHangup(overlayInput),
    tapOverlayActive: shouldShowTapToRevealOverlay(overlayInput),
    showControls,
    bumpControlsActivity,
  };
}
