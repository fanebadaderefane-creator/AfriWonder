export type PublishUploadUiStatus = 'idle' | 'uploading' | 'retrying' | 'failed' | 'success' | 'cancelled';

/** Pourcentage affiché 0–100 (entier). */
export function clampPublishUploadPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Envoi fichier vidéo : plage 5–85 % de la barre globale. */
export function mapVideoBytesRatioToGlobalPercent(ratio01: number): number {
  const r = Math.max(0, Math.min(1, ratio01));
  return clampPublishUploadPercent(5 + r * 80);
}

export function getPublishUploadStatusLabel(input: {
  percent: number;
  status: PublishUploadUiStatus;
  retryAttempt: number;
  isVideo: boolean;
}): string {
  const pct = clampPublishUploadPercent(input.percent);
  if (input.status === 'retrying') {
    return `Reconnexion… ${pct}% (tentative ${Math.max(1, input.retryAttempt)})`;
  }
  if (input.status === 'cancelled') {
    return 'Upload annulé';
  }
  if (pct >= 100) {
    return input.isVideo ? 'Vidéo publiée' : 'Publication terminée';
  }
  if (pct >= 96) {
    return `Publication… ${pct}%`;
  }
  if (pct >= 86) {
    return `Finalisation… ${pct}%`;
  }
  if (pct >= 5) {
    return input.isVideo ? `Envoi de la vidéo… ${pct}%` : `Envoi… ${pct}%`;
  }
  return `Préparation… ${pct}%`;
}
