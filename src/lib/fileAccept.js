/**
 * Accept strings for file inputs — compatibles PWA mobile (iOS, Android).
 * Utiliser ces constantes pour que le sélecteur de fichiers propose bien
 * photos ou vidéos selon le contexte (évite que "Importer" n'affiche que les vidéos).
 */

/** Pour sélectionner des images (galerie/camera). Compatible iOS (HEIC), Android, PWA. */
export const FILE_ACCEPT_IMAGES =
  'image/*,image/jpeg,image/jpg,image/png,image/webp,image/heic';

/** Pour sélectionner des vidéos uniquement. */
export const FILE_ACCEPT_VIDEOS =
  'video/*,video/mp4,video/quicktime,video/x-m4v';
