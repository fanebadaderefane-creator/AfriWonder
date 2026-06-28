import { useEffect, useLayoutEffect, useRef, type DependencyList } from 'react';
import { logAfwCall } from './callDiagnosticLog';

function runSafeEffectPhase(
  effectName: string,
  phase: 'mount' | 'cleanup' | 'layout_mount' | 'layout_cleanup',
  fn: () => void,
): void {
  try {
    fn();
  } catch (error) {
    logAfwCall('call_screen_effect_error', {
      effect: effectName,
      phase,
      error: String((error as Error)?.message ?? error),
    });
  }
}

function useCallScreenSafeEffectImpl(
  hook: typeof useEffect,
  effectName: string,
  effect: () => void | (() => void),
  deps: DependencyList,
  layout: boolean,
): void {
  const nameRef = useRef(effectName);
  nameRef.current = effectName;
  const mountPhase = layout ? 'layout_mount' : 'mount';
  const cleanupPhase = layout ? 'layout_cleanup' : 'cleanup';

  hook(() => {
    let cleanup: void | (() => void);
    runSafeEffectPhase(nameRef.current, mountPhase, () => {
      cleanup = effect();
    });
    return () => {
      if (typeof cleanup !== 'function') return;
      runSafeEffectPhase(nameRef.current, cleanupPhase, cleanup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Effet React — log mount/cleanup sans rethrow (évite cascade ErrorBoundary post agora_join_ok). */
export function useCallScreenSafeEffect(
  effectName: string,
  effect: () => void | (() => void),
  deps: DependencyList,
): void {
  useCallScreenSafeEffectImpl(useEffect, effectName, effect, deps, false);
}

/** useLayoutEffect protégé — même sémantique que useCallScreenSafeEffect. */
export function useCallScreenSafeLayoutEffect(
  effectName: string,
  effect: () => void | (() => void),
  deps: DependencyList,
): void {
  useCallScreenSafeEffectImpl(useLayoutEffect, effectName, effect, deps, true);
}
