export type CameraEffectId =
  | 'none'
  | 'lissage_doux'
  | 'lumiere_chaude'
  | 'ecran_vert';

export interface CameraEffectOption {
  id: CameraEffectId;
  label: string;
  hint: string;
  /** Filtre ffmpeg côté serveur (pas un contrat figé). */
  serverFilterHint: string | null;
  /** True quand l’effet doit afficher un aperçu visuel de secours (placeholder). */
  livePreviewAvailable: boolean;
}

export const CAMERA_EFFECT_OPTIONS: ReadonlyArray<CameraEffectOption> = [
  {
    id: 'none',
    label: 'Original',
    hint: 'Aucun effet',
    serverFilterHint: null,
    livePreviewAvailable: true,
  },
  {
    id: 'lissage_doux',
    label: 'Lissage',
    hint: 'Adoucit la peau',
    serverFilterHint: 'gblur=sigma=1.4:steps=2,unsharp=5:5:0.6',
    livePreviewAvailable: false,
  },
  {
    id: 'lumiere_chaude',
    label: 'Chaude',
    hint: 'Tons chauds africains',
    serverFilterHint: 'curves=red=0/0.05 0.5/0.55 1/1:green=0/0 0.5/0.5 1/0.95:blue=0/0 0.5/0.45 1/0.85,eq=saturation=1.05',
    livePreviewAvailable: true,
  },
  {
    id: 'ecran_vert',
    label: 'Écran vert',
    hint: 'Détoure le sujet (chroma key)',
    serverFilterHint: 'chromakey=0x00ff00:0.18:0.05',
    livePreviewAvailable: false,
  },
];

export function isValidCameraEffect(v: unknown): v is CameraEffectId {
  return typeof v === 'string' && CAMERA_EFFECT_OPTIONS.some((o) => o.id === v);
}

export function safeCameraEffect(v: unknown): CameraEffectId {
  return isValidCameraEffect(v) ? v : 'none';
}

export function buildCameraEffectPayload(effect: CameraEffectId) {
  const option = CAMERA_EFFECT_OPTIONS.find((o) => o.id === effect);
  return {
    cameraEffect: effect,
    serverFilterHint: option?.serverFilterHint ?? null,
  };
}

/**
 * Renvoie un aperçu UX texte sans aperçu live (utile pour afficher "Effet appliqué à la publication").
 */
export function describeCameraEffect(effect: CameraEffectId): string {
  const opt = CAMERA_EFFECT_OPTIONS.find((o) => o.id === effect);
  if (!opt || effect === 'none') return '';
  if (opt.livePreviewAvailable) return `Effet "${opt.label}" : aperçu disponible.`;
  return `Effet "${opt.label}" : appliqué à la publication (rendu serveur).`;
}
