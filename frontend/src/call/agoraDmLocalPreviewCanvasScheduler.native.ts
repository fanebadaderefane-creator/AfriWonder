/**
 * Sync canvas locale — debounce + déduplication layout (natif).
 */
import { Platform } from 'react-native';
import { resetAgoraDmAndroidStartPreviewGate } from './agoraCallVideoBind.native';
import { refreshAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvas';
import { logAfwCall } from './callDiagnosticLog';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';
import {
  agoraDmLocalPreviewLayoutKey,
  shouldRefreshAgoraDmLocalPreviewOnLayout,
} from './agoraDmLocalPreviewSurfaceLayout';

const SURFACE_LAYOUT_DEBOUNCE_MS = 48;

let lastSurfaceLayoutKey = '';
let surfaceLayoutTimer: ReturnType<typeof setTimeout> | null = null;

export function resetAgoraDmLocalPreviewCanvasScheduler(): void {
  lastSurfaceLayoutKey = '';
  if (surfaceLayoutTimer) {
    clearTimeout(surfaceLayoutTimer);
    surfaceLayoutTimer = null;
  }
  resetAgoraDmAndroidStartPreviewGate();
}

/** Après onLayout — attend taille valide puis sync (évite canvas sur PiP vide). */
export function scheduleAgoraDmLocalPreviewCanvasOnSurfaceLayout(width: number, height: number): void {
  if (!shouldRefreshAgoraDmLocalPreviewOnLayout(width, height)) return;
  const key = agoraDmLocalPreviewLayoutKey(width, height);
  if (key === lastSurfaceLayoutKey) return;
  lastSurfaceLayoutKey = key;
  if (surfaceLayoutTimer) clearTimeout(surfaceLayoutTimer);
  surfaceLayoutTimer = setTimeout(() => {
    surfaceLayoutTimer = null;
    logAfwCall('PIP_LAYOUT', { action: 'surface_layout', key, platform: Platform.OS });
    useAgoraDmCallUiStore.getState().setLocalPreviewSurfaceLaidOut(true);
    if (Platform.OS !== 'android') {
      refreshAgoraDmLocalPreviewCanvas(`surface_layout_${key}`);
    }
  }, SURFACE_LAYOUT_DEBOUNCE_MS);
}
