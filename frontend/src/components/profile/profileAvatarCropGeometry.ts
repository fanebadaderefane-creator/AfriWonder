/** Géométrie pure — recadrage carré profil (pixels image ↔ mise en page écran). */

export type CropStageMetrics = {
  stageW: number;
  stageH: number;
  cropL: number;
  cropX: number;
  cropY: number;
  naturalW: number;
  naturalH: number;
  /** Échelle uniforme : image couvre le carré (min pour couvrir). */
  baseScale: number;
  /** Facteur pincement utilisateur ≥ 1 */
  pinchScale: number;
  panX: number;
  panY: number;
};

export function computeUniformCoverScale(naturalW: number, naturalH: number, cropL: number): number {
  if (naturalW <= 0 || naturalH <= 0 || cropL <= 0) return 1;
  return Math.max(cropL / naturalW, cropL / naturalH);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Limites de translation pour que le carré de coupe reste entièrement sur l’image affichée. */
export function panExtents(m: Omit<CropStageMetrics, 'panX' | 'panY'>): { minX: number; maxX: number; minY: number; maxY: number } {
  const S = m.baseScale * m.pinchScale;
  const iw = m.naturalW * S;
  const ih = m.naturalH * S;
  const cxOff = (m.stageW - iw) / 2;
  const cyOff = (m.stageH - ih) / 2;

  const minX = m.cropX + m.cropL - iw - cxOff;
  const maxX = m.cropX - cxOff;
  const minY = m.cropY + m.cropL - ih - cyOff;
  const maxY = m.cropY - cyOff;

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
  };
}

export type CropPixelRect = { originX: number; originY: number; size: number };

/** Rectangle carré à passer à expo-image-manipulator (`crop`), en pixels de l’image source courante. */
export function computeSquareCropPixels(m: CropStageMetrics): CropPixelRect | null {
  const { stageW, stageH, cropX, cropY, cropL, naturalW, naturalH, baseScale, pinchScale, panX, panY } = m;
  if (naturalW <= 0 || naturalH <= 0 || cropL <= 0 || stageW <= 0 || stageH <= 0) return null;

  const S = baseScale * pinchScale;
  const iw = naturalW * S;
  const ih = naturalH * S;
  const imgLeft = (stageW - iw) / 2 + panX;
  const imgTop = (stageH - ih) / 2 + panY;

  const originXF = (cropX - imgLeft) / S;
  const originYF = (cropY - imgTop) / S;
  const sideF = cropL / S;

  let originX = Math.floor(originXF);
  let originY = Math.floor(originYF);
  let side = Math.round(sideF);

  originX = clamp(originX, 0, Math.max(0, naturalW - 1));
  originY = clamp(originY, 0, Math.max(0, naturalH - 1));
  side = clamp(side, 1, Math.max(1, Math.min(naturalW - originX, naturalH - originY)));

  // Carré strict : prendre le côté minimal disponible pour rester dans l’image.
  const maxSide = Math.min(naturalW - originX, naturalH - originY);
  side = clamp(side, 1, maxSide);

  return { originX, originY, size: side };
}
