import { describe, expect, it } from 'vitest';
import {
  clampPublishUploadPercent,
  getPublishUploadStatusLabel,
  mapVideoBytesRatioToGlobalPercent,
} from './publishUploadProgress';

describe('publishUploadProgress', () => {
  it('clamp 0–100', () => {
    expect(clampPublishUploadPercent(-5)).toBe(0);
    expect(clampPublishUploadPercent(42.7)).toBe(43);
    expect(clampPublishUploadPercent(150)).toBe(100);
  });

  it('map vidéo bytes → pourcent global', () => {
    expect(mapVideoBytesRatioToGlobalPercent(0)).toBe(5);
    expect(mapVideoBytesRatioToGlobalPercent(1)).toBe(85);
    expect(mapVideoBytesRatioToGlobalPercent(0.5)).toBe(45);
  });

  it('libellé avec pourcent', () => {
    expect(
      getPublishUploadStatusLabel({
        percent: 42,
        status: 'uploading',
        retryAttempt: 0,
        isVideo: true,
      }),
    ).toBe('Envoi de la vidéo… 42%');
  });
});
