/** Garde layout surface locale — évite setupLocalVideo sur vue 0×0 (écran noir PiP). */

export const AGORA_DM_LOCAL_PREVIEW_MIN_LAYOUT_PX = 2;

export function shouldRefreshAgoraDmLocalPreviewOnLayout(width: number, height: number): boolean {
  return width >= AGORA_DM_LOCAL_PREVIEW_MIN_LAYOUT_PX && height >= AGORA_DM_LOCAL_PREVIEW_MIN_LAYOUT_PX;
}

export function agoraDmLocalPreviewLayoutKey(width: number, height: number): string {
  return `${Math.round(width)}x${Math.round(height)}`;
}
