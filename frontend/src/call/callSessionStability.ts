import { AppState, BackHandler, Platform } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { trimMobileAppCaches } from '../lib/mobileMemoryMaintenance';
import {
  logAndroidBackPressed,
  logAppStateChange,
  logCallUiHidden,
  logCallUiVisible,
  logNavigationBlur,
  logNavigationFocus,
  logVideoScreenMount,
  logVideoScreenUnmount,
} from './callUiLifecycleLog';

/**
 * Libère de la RAM avant d’ouvrir WebRTC (micro/caméra + PeerConnection).
 * Réduit les fermetures Android/iOS au lancement d’un appel vocal ou vidéo.
 */
export function prepareCallSessionMemory(): void {
  if (Platform.OS === 'web') return;
  trimMobileAppCaches('call-screen-enter', { force: true });
}

/**
 * Nettoyage après fin d’appel ou sortie de l’écran — caches image + React Query inactif.
 */
export function releaseCallSessionMemory(): void {
  if (Platform.OS === 'web') return;
  trimMobileAppCaches('call-screen-exit', { force: true });
}

export type CallScreenLifecycleGuardInput = {
  engine: 'agora' | 'webrtc';
  callId: string;
  role: string;
  isVideoCall: boolean;
  blockAndroidBack?: boolean;
  onAndroidBackWhileBlocked?: () => void;
};

/** Logs diagnostic + Retour Android bloqué pendant l’appel actif. */
export function useCallScreenLifecycleGuards(input: CallScreenLifecycleGuardInput): void {
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    const meta = {
      engine: input.engine,
      callId: input.callId,
      role: input.role,
      isVideoCall: input.isVideoCall,
      platform: Platform.OS,
    };
    logVideoScreenMount(meta);
    logCallUiVisible(meta);
    return () => {
      logCallUiHidden(meta);
      logVideoScreenUnmount(meta);
    };
  }, [input.callId, input.engine, input.isVideoCall, input.role]);

  useFocusEffect(
    useCallback(() => {
      const meta = {
        engine: inputRef.current.engine,
        callId: inputRef.current.callId,
        role: inputRef.current.role,
      };
      logNavigationFocus(meta);
      logCallUiVisible(meta);
      return () => {
        logNavigationBlur(meta);
      };
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      logAppStateChange(next, {
        engine: inputRef.current.engine,
        callId: inputRef.current.callId,
      });
      if (next === 'background' || next === 'inactive') {
        logCallUiHidden({
          engine: inputRef.current.engine,
          callId: inputRef.current.callId,
          appState: next,
        });
      } else if (next === 'active') {
        logCallUiVisible({
          engine: inputRef.current.engine,
          callId: inputRef.current.callId,
          appState: next,
        });
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const cur = inputRef.current;
      if (!cur.blockAndroidBack) return false;
      logAndroidBackPressed({
        engine: cur.engine,
        callId: cur.callId,
        role: cur.role,
        blocked: true,
      });
      cur.onAndroidBackWhileBlocked?.();
      return true;
    });
    return () => sub.remove();
  }, []);
}
