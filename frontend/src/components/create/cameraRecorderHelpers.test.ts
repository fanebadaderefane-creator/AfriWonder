import { describe, expect, it } from 'vitest';
import {
  CAMERA_DURATION_OPTIONS,
  CAMERA_SPEED_OPTIONS,
  clampDurationCap,
  clampSpeed,
  flashIconName,
  fmtCameraTime,
  isValidCameraDuration,
  isValidCameraSpeed,
  nextFlashCycle,
  progressPercent,
  remainingSeconds,
  shouldAutoStop,
} from './cameraRecorderHelpers';

describe('cameraRecorderHelpers', () => {
  it('expose les durées et vitesses TikTok-like', () => {
    expect(CAMERA_DURATION_OPTIONS).toEqual([15, 60, 180]);
    expect(CAMERA_SPEED_OPTIONS).toEqual([0.5, 1, 2, 3]);
  });

  it('isValidCameraDuration ne valide que 15/60/180', () => {
    expect(isValidCameraDuration(15)).toBe(true);
    expect(isValidCameraDuration(60)).toBe(true);
    expect(isValidCameraDuration(180)).toBe(true);
    expect(isValidCameraDuration(120)).toBe(false);
    expect(isValidCameraDuration('60')).toBe(false);
  });

  it('isValidCameraSpeed ne valide que 0.5/1/2/3', () => {
    expect(isValidCameraSpeed(0.5)).toBe(true);
    expect(isValidCameraSpeed(1)).toBe(true);
    expect(isValidCameraSpeed(2)).toBe(true);
    expect(isValidCameraSpeed(3)).toBe(true);
    expect(isValidCameraSpeed(1.5)).toBe(false);
    expect(isValidCameraSpeed(0)).toBe(false);
  });

  it('clampDurationCap rabote vers le palier le plus proche', () => {
    expect(clampDurationCap(0)).toBe(15);
    expect(clampDurationCap(15)).toBe(15);
    expect(clampDurationCap(45)).toBe(60);
    expect(clampDurationCap(120)).toBe(60);
    expect(clampDurationCap(121)).toBe(180);
    expect(clampDurationCap(900)).toBe(180);
  });

  it('clampSpeed accepte 0.5/1/2/3', () => {
    expect(clampSpeed(0.1)).toBe(0.5);
    expect(clampSpeed(0.5)).toBe(0.5);
    expect(clampSpeed(0.9)).toBe(1);
    expect(clampSpeed(1.7)).toBe(2);
    expect(clampSpeed(2)).toBe(2);
    expect(clampSpeed(5)).toBe(3);
  });

  it('fmtCameraTime affiche MM:SS', () => {
    expect(fmtCameraTime(0)).toBe('00:00');
    expect(fmtCameraTime(7)).toBe('00:07');
    expect(fmtCameraTime(75)).toBe('01:15');
    expect(fmtCameraTime(180)).toBe('03:00');
    expect(fmtCameraTime(-3)).toBe('00:00');
    expect(fmtCameraTime(NaN)).toBe('00:00');
  });

  it('nextFlashCycle suit off → on → auto → off', () => {
    expect(nextFlashCycle('off')).toBe('on');
    expect(nextFlashCycle('on')).toBe('auto');
    expect(nextFlashCycle('auto')).toBe('off');
  });

  it('flashIconName mappe vers les bons icônes Ionicons', () => {
    expect(flashIconName('off')).toBe('flash-off');
    expect(flashIconName('on')).toBe('flash');
    expect(flashIconName('auto')).toBe('flash-outline');
  });

  it('progressPercent calcule un % borné [0, 100]', () => {
    expect(progressPercent(0, 60)).toBe(0);
    expect(progressPercent(15_000, 60)).toBe(25);
    expect(progressPercent(60_000, 60)).toBe(100);
    expect(progressPercent(90_000, 60)).toBe(100);
    expect(progressPercent(-1, 60)).toBe(0);
    expect(progressPercent(10_000, 0)).toBe(0);
  });

  it('remainingSeconds décompte sans descendre sous 0', () => {
    expect(remainingSeconds(0, 60)).toBe(60);
    expect(remainingSeconds(15_000, 60)).toBe(45);
    expect(remainingSeconds(60_000, 60)).toBe(0);
    expect(remainingSeconds(120_000, 60)).toBe(0);
  });

  it('shouldAutoStop déclenche au plafond exact', () => {
    expect(shouldAutoStop(0, 60)).toBe(false);
    expect(shouldAutoStop(59_000, 60)).toBe(false);
    expect(shouldAutoStop(60_000, 60)).toBe(true);
    expect(shouldAutoStop(60_500, 60)).toBe(true);
    expect(shouldAutoStop(NaN, 60)).toBe(false);
  });
});
