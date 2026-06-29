/**

 * Sync canvas locale — debounce + déduplication layout (natif).

 */

import { refreshAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvas';

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

    refreshAgoraDmLocalPreviewCanvas(`surface_layout_${key}`);

  }, SURFACE_LAYOUT_DEBOUNCE_MS);

}


