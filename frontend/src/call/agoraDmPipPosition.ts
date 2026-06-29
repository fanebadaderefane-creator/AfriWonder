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
    reason.includes('canvas_after_') ||
    reason.includes('overlay_layout') ||
    reason.includes('surface_layout') ||
    reason.includes('feeds_swapped') ||
    reason.includes('resume_minimized') ||
    reason.includes('pin_local') ||
    reason.includes('resume_call') ||
    reason.includes('remote_ever_joined')
  );
}
