export type CameraDurationPreset = 15 | 60 | 180;
export type CameraSpeedPreset = 0.5 | 1 | 2 | 3;
export type CameraFlashCycle = 'off' | 'on' | 'auto';

export const CAMERA_DURATION_OPTIONS: ReadonlyArray<CameraDurationPreset> = [15, 60, 180];
export const CAMERA_SPEED_OPTIONS: ReadonlyArray<CameraSpeedPreset> = [0.5, 1, 2, 3];

export function isValidCameraDuration(v: unknown): v is CameraDurationPreset {
  return typeof v === 'number' && (CAMERA_DURATION_OPTIONS as ReadonlyArray<number>).includes(v);
}

export function isValidCameraSpeed(v: unknown): v is CameraSpeedPreset {
  return typeof v === 'number' && (CAMERA_SPEED_OPTIONS as ReadonlyArray<number>).includes(v);
}

export function clampDurationCap(v: number): CameraDurationPreset {
  if (v <= 30) return 15;
  if (v <= 120) return 60;
  return 180;
}

export function clampSpeed(v: number): CameraSpeedPreset {
  if (v <= 0.5) return 0.5;
  if (v <= 1) return 1;
  if (v <= 2) return 2;
  return 3;
}

export function fmtCameraTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00';
  const sec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function nextFlashCycle(current: CameraFlashCycle): CameraFlashCycle {
  if (current === 'off') return 'on';
  if (current === 'on') return 'auto';
  return 'off';
}

export function flashIconName(current: CameraFlashCycle): 'flash' | 'flash-outline' | 'flash-off' {
  if (current === 'on') return 'flash';
  if (current === 'auto') return 'flash-outline';
  return 'flash-off';
}

export function progressPercent(elapsedMs: number, durationCapSec: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (!Number.isFinite(durationCapSec) || durationCapSec <= 0) return 0;
  const pct = (elapsedMs / (durationCapSec * 1000)) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

export function remainingSeconds(elapsedMs: number, durationCapSec: number): number {
  const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
  return Math.max(0, durationCapSec - elapsed);
}

export function shouldAutoStop(elapsedMs: number, durationCapSec: number): boolean {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(durationCapSec)) return false;
  return elapsedMs >= durationCapSec * 1000;
}
