import {
  AGORA_DM_VIDEO_PIP_HEIGHT,
  AGORA_DM_VIDEO_PIP_WIDTH,
} from './agoraDmVideoLayout';

/** PiP toujours visible après rotation — clamp dans la fenêtre. */
export function clampAgoraDmPipDrag(input: {
  x: number;
  y: number;
  windowWidth: number;
  windowHeight: number;
  margin?: number;
}): { x: number; y: number } {
  const margin = input.margin ?? 8;
  const maxX = Math.max(margin, input.windowWidth - AGORA_DM_VIDEO_PIP_WIDTH - margin);
  const maxY = Math.max(margin, input.windowHeight - AGORA_DM_VIDEO_PIP_HEIGHT - margin);
  return {
    x: Math.min(maxX, Math.max(margin, input.x)),
    y: Math.min(maxY, Math.max(margin, input.y)),
  };
}

export function shouldAgoraDmPreviewStartPreview(reason: string): boolean {
  return (
    reason.includes('minimized') ||
    reason.includes('app_foreground') ||
    reason.includes('overlay_flip') ||
    reason.includes('overlay_layout') ||
    reason.includes('surface_layout') ||
    reason.includes('feeds_swapped') ||
    reason.includes('resume_minimized') ||
    reason.includes('pin_local') ||
    reason.includes('resume_call') ||
    reason.includes('remote_ever_joined')
  );
}

/**
 * Après joinChannel, startPreview() sur TextureView Android = PiP noir (flux publié ≠ preview).
 * iOS : startPreview sur layout / foreground / PiP chat (liste shouldAgoraDmPreviewStartPreview).
 * Android DM : **uniquement** après onLayout RtcTextureView (`surface_layout_WxH`) hors canal —
 * évite RangeError stack overflow (juin 2026 terrain).
 */
export function resolveAgoraDmCanvasStartPreview(
  reason: string,
  inChannel: boolean,
  platform = 'ios',
): boolean {
  if (inChannel) return false;
  if (platform === 'android') {
    return reason.includes('surface_layout_');
  }
  return shouldAgoraDmPreviewStartPreview(reason);
}

/** Android DM — jamais engine.startPreview() direct (hors sync policy surface_layout). */
export function shouldAgoraDmDirectEngineStartPreview(platform: string, inChannel = false): boolean {
  if (platform === 'android') return false;
  return !inChannel;
}
