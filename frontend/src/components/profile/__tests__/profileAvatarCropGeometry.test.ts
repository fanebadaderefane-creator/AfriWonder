import { describe, expect, it } from 'vitest';
import {
  computeSquareCropPixels,
  computeUniformCoverScale,
  panExtents,
} from '../profileAvatarCropGeometry';

describe('profileAvatarCropGeometry', () => {
  it('computeUniformCoverScale prend le max pour couvrir le carré', () => {
    expect(computeUniformCoverScale(1000, 500, 300)).toBeCloseTo(0.6);
    expect(computeUniformCoverScale(500, 1000, 300)).toBeCloseTo(0.6);
  });

  it('computeSquareCropPixels — pan nul, image plus large que le carré', () => {
    const metrics = {
      stageW: 400,
      stageH: 400,
      cropL: 300,
      cropX: 50,
      cropY: 50,
      naturalW: 1000,
      naturalH: 800,
      baseScale: computeUniformCoverScale(1000, 800, 300),
      pinchScale: 1,
      panX: 0,
      panY: 0,
    };
    const rect = computeSquareCropPixels(metrics);
    expect(rect).not.toBeNull();
    expect(rect!.originX).toBeGreaterThanOrEqual(0);
    expect(rect!.originY).toBeGreaterThanOrEqual(0);
    expect(rect!.size).toBeGreaterThan(0);
    expect(rect!.originX + rect!.size).toBeLessThanOrEqual(1000);
    expect(rect!.originY + rect!.size).toBeLessThanOrEqual(800);
  });

  it('panExtents donne une fenêtre valide quand l’image couvre le carré', () => {
    const ex = panExtents({
      stageW: 400,
      stageH: 400,
      cropL: 300,
      cropX: 50,
      cropY: 50,
      naturalW: 1000,
      naturalH: 800,
      baseScale: computeUniformCoverScale(1000, 800, 300),
      pinchScale: 1,
    });
    expect(ex.minX).toBeLessThanOrEqual(ex.maxX);
    expect(ex.minY).toBeLessThanOrEqual(ex.maxY);
  });
});
